import { db } from "@timeo/db";
import {
  posTransactions,
  products,
  stockMovements,
  auditLogs,
  memberships,
  subscriptions,
  sessionPackages,
  sessionCredits,
} from "@timeo/db/schema";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";
import * as LoyaltyService from "./loyalty.service.js";

interface PosItem {
  type: "membership" | "session_package" | "service" | "product";
  referenceId: string;
  name: string;
  price: number;
  quantity: number;
}

function addMonths(base: Date, months: number): Date {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function createPosTransaction(input: {
  tenantId: string;
  customerId: string;
  staffId: string;
  items: PosItem[];
  paymentMethod: "cash" | "card" | "qr_pay" | "bank_transfer" | "revenue_monster";
  voucherId?: string;
  discount?: number;
  notes?: string;
}) {
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = input.discount ?? 0;
  const total = subtotal - discount;

  const txId = generateId();
  const receiptNumber = `RCP-${Date.now()}-${txId.slice(0, 6).toUpperCase()}`;

  await db.insert(posTransactions).values({
    id: txId,
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    staff_id: input.staffId,
    items: input.items,
    subtotal,
    discount,
    total,
    payment_method: input.paymentMethod,
    voucher_id: input.voucherId ?? null,
    receipt_number: receiptNumber,
    notes: input.notes ?? null,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.staffId,
    actor_role: "staff",
    action: "pos.transaction_created",
    resource_type: "pos_transaction",
    resource_id: txId,
    details: { total, paymentMethod: input.paymentMethod },
  });

  // Grant entitlements and process product stock movements
  for (const item of input.items) {
    if (item.type === "membership") {
      const [membershipPlan] = await db
        .select({ id: memberships.id, durationMonths: memberships.duration_months })
        .from(memberships)
        .where(
          and(
            eq(memberships.id, item.referenceId),
            eq(memberships.tenant_id, input.tenantId),
          ),
        )
        .limit(1);

      if (!membershipPlan) {
        throw new Error(`Membership plan not found: ${item.referenceId}`);
      }

      const now = new Date();
      const quantity = Math.max(1, item.quantity);
      const durationMonths = (membershipPlan.durationMonths ?? 1) * quantity;

      const [activeSub] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenant_id, input.tenantId),
            eq(subscriptions.customer_id, input.customerId),
            eq(subscriptions.status, "active"),
            gt(subscriptions.current_period_end, now),
          ),
        )
        .orderBy(desc(subscriptions.current_period_end))
        .limit(1);

      const extensionBase = activeSub?.current_period_end ?? now;
      const periodEnd = addMonths(extensionBase, durationMonths);
      const pricePaid = item.price * quantity;

      let subscriptionId: string;

      if (activeSub) {
        subscriptionId = activeSub.id;

        await db
          .update(subscriptions)
          .set({
            membership_id: membershipPlan.id,
            status: "active",
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            package_type: "membership",
            price_paid: pricePaid,
            updated_at: now,
          })
          .where(eq(subscriptions.id, activeSub.id));
      } else {
        subscriptionId = generateId();

        await db.insert(subscriptions).values({
          id: subscriptionId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          membership_id: membershipPlan.id,
          status: "active",
          current_period_start: now,
          current_period_end: periodEnd,
          package_type: "membership",
          price_paid: pricePaid,
        });
      }

      await db.insert(auditLogs).values({
        id: generateId(),
        tenant_id: input.tenantId,
        actor_id: input.staffId,
        actor_role: "staff",
        action: "pos.entitlement_membership_granted",
        resource_type: "subscription",
        resource_id: subscriptionId,
        details: {
          transactionId: txId,
          membershipId: membershipPlan.id,
          quantity,
          pricePaid,
        },
      });

      continue;
    }

    if (item.type === "session_package") {
      const [pkg] = await db
        .select({ id: sessionPackages.id, sessionCount: sessionPackages.session_count })
        .from(sessionPackages)
        .where(
          and(
            eq(sessionPackages.id, item.referenceId),
            eq(sessionPackages.tenant_id, input.tenantId),
          ),
        )
        .limit(1);

      if (!pkg) {
        throw new Error(`Session package not found: ${item.referenceId}`);
      }

      const now = new Date();
      const quantity = Math.max(1, item.quantity);
      const sessionsToAdd = pkg.sessionCount * quantity;

      const [activeCredits] = await db
        .select()
        .from(sessionCredits)
        .where(
          and(
            eq(sessionCredits.tenant_id, input.tenantId),
            eq(sessionCredits.user_id, input.customerId),
            eq(sessionCredits.package_id, pkg.id),
            sql`${sessionCredits.total_sessions} > ${sessionCredits.used_sessions}`,
            or(
              isNull(sessionCredits.expires_at),
              gt(sessionCredits.expires_at, now),
            ),
          ),
        )
        .orderBy(desc(sessionCredits.purchased_at))
        .limit(1);

      let sessionCreditId: string;

      if (activeCredits) {
        sessionCreditId = activeCredits.id;

        await db
          .update(sessionCredits)
          .set({
            total_sessions: activeCredits.total_sessions + sessionsToAdd,
          })
          .where(eq(sessionCredits.id, activeCredits.id));
      } else {
        sessionCreditId = generateId();

        await db.insert(sessionCredits).values({
          id: sessionCreditId,
          tenant_id: input.tenantId,
          user_id: input.customerId,
          package_id: pkg.id,
          total_sessions: sessionsToAdd,
          used_sessions: 0,
          purchased_at: now,
        });
      }

      await db.insert(auditLogs).values({
        id: generateId(),
        tenant_id: input.tenantId,
        actor_id: input.staffId,
        actor_role: "staff",
        action: "pos.entitlement_session_credits_granted",
        resource_type: "session_credit",
        resource_id: sessionCreditId,
        details: {
          transactionId: txId,
          packageId: pkg.id,
          quantity,
          sessionsAdded: sessionsToAdd,
        },
      });

      continue;
    }

    if (item.type === "product") {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.referenceId))
        .limit(1);

      if (product && product.stock_quantity !== null) {
        const newStock = product.stock_quantity - item.quantity;
        await db
          .update(products)
          .set({ stock_quantity: Math.max(0, newStock), updated_at: new Date() })
          .where(eq(products.id, item.referenceId));

        await db.insert(stockMovements).values({
          id: generateId(),
          tenant_id: input.tenantId,
          product_id: item.referenceId,
          delta: -item.quantity,
          stock_before: product.stock_quantity,
          stock_after: Math.max(0, newStock),
          reason: "pos_transaction",
          reference_id: txId,
          actor_id: input.staffId,
        });
      }
    }
  }

  // Earn loyalty points
  try {
    await LoyaltyService.earnPoints({
      tenantId: input.tenantId,
      userId: input.customerId,
      amount: total,
      referenceType: "pos_transaction",
      referenceId: txId,
    });
  } catch {
    // Don't fail POS transaction if loyalty fails
  }

  emitToTenant(input.tenantId, SocketEvents.POS_TRANSACTION_CREATED, {
    transactionId: txId,
    tenantId: input.tenantId,
  });

  return { transactionId: txId, receiptNumber, total };
}

export async function voidTransaction(txId: string, actorId: string) {
  const [tx] = await db
    .select()
    .from(posTransactions)
    .where(eq(posTransactions.id, txId))
    .limit(1);
  if (!tx) throw new Error("Transaction not found");
  if (tx.status !== "completed")
    throw new Error("Only completed transactions can be voided");

  await db
    .update(posTransactions)
    .set({ status: "voided" })
    .where(eq(posTransactions.id, txId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: tx.tenant_id,
    actor_id: actorId,
    actor_role: "staff",
    action: "pos.transaction_voided",
    resource_type: "pos_transaction",
    resource_id: txId,
  });
}
