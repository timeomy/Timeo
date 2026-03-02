import { db } from "@timeo/db";
import { payments, auditLogs } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import * as RMService from "./revenue-monster.service.js";

/**
 * Unified payment facade for Stripe and Revenue Monster.
 */

export interface CreatePaymentResult {
  paymentId: string;
  /** Redirect URL returned by Revenue Monster for FPX/eWallet payments. */
  paymentUrl?: string;
  /** Revenue Monster order ID stored for webhook correlation. */
  rmOrderId?: string;
}

export async function createPayment(input: {
  tenantId: string;
  customerId: string;
  amount: number;
  currency?: string;
  orderId?: string;
  bookingId?: string;
  gateway: "stripe" | "revenue_monster";
  /** Human-readable description sent to the payment gateway. */
  description?: string;
  /** URL to redirect the user after payment (required for RM web payments). */
  redirectUrl?: string;
}): Promise<CreatePaymentResult> {
  const paymentId = generateId();

  await db.insert(payments).values({
    id: paymentId,
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    amount: input.amount,
    currency: input.currency ?? "MYR",
    order_id: input.orderId ?? null,
    booking_id: input.bookingId ?? null,
    status: "pending",
  });

  let paymentUrl: string | undefined;
  let rmOrderId: string | undefined;

  if (input.gateway === "stripe") {
    // TODO: Create Stripe PaymentIntent
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const pi = await stripe.paymentIntents.create({ amount, currency, ... });
    // await db.update(payments).set({ stripe_payment_intent_id: pi.id }).where(eq(payments.id, paymentId));
  } else if (input.gateway === "revenue_monster") {
    const apiUrl = process.env.API_URL ?? "https://api.timeo.my";
    const siteUrl = process.env.SITE_URL ?? "https://timeo.my";

    const rmResult = await RMService.createPayment({
      amount: input.amount,
      currency: input.currency ?? "MYR",
      orderId: input.orderId ?? paymentId,
      description: input.description ?? "Timeo Payment",
      redirectUrl: input.redirectUrl ?? `${siteUrl}/payment/complete`,
      notifyUrl: `${apiUrl}/webhooks/revenue-monster`,
    });

    paymentUrl = rmResult.paymentUrl;
    rmOrderId = rmResult.rmOrderId;

    await db
      .update(payments)
      .set({ rm_order_id: rmOrderId })
      .where(eq(payments.id, paymentId));
  }

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.customerId,
    actor_role: "customer",
    action: "payment.created",
    resource_type: "payment",
    resource_id: paymentId,
    details: { amount: input.amount, gateway: input.gateway },
  });

  return { paymentId, paymentUrl, rmOrderId };
}

export async function updatePaymentStatus(
  paymentId: string,
  status: "processing" | "succeeded" | "failed" | "refunded",
  actorId: string,
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!payment) throw new Error("Payment not found");

  await db
    .update(payments)
    .set({ status, updated_at: new Date() })
    .where(eq(payments.id, paymentId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: payment.tenant_id,
    actor_id: actorId,
    actor_role: "staff",
    action: `payment.${status}`,
    resource_type: "payment",
    resource_id: paymentId,
  });
}
