import { db } from "@timeo/db";
import { posTransactions, products, stockMovements, auditLogs } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
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

  // Decrement stock for product items
  for (const item of input.items) {
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
