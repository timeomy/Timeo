import { db } from "@timeo/db";
import { payments, auditLogs } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

/**
 * Unified payment facade for Stripe and Revenue Monster.
 */

export async function createPayment(input: {
  tenantId: string;
  customerId: string;
  amount: number;
  currency?: string;
  orderId?: string;
  bookingId?: string;
  gateway: "stripe" | "revenue_monster";
}) {
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

  if (input.gateway === "stripe") {
    // TODO: Create Stripe PaymentIntent
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const pi = await stripe.paymentIntents.create({ amount, currency, ... });
    // await db.update(payments).set({ stripe_payment_intent_id: pi.id }).where(eq(payments.id, paymentId));
  } else {
    // TODO: Create Revenue Monster payment
    // See revenue-monster.service.ts
  }

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.customerId,
    action: "payment.created",
    resource: "payments",
    resource_id: paymentId,
    metadata: { amount: input.amount, gateway: input.gateway },
  });

  return paymentId;
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
    action: `payment.${status}`,
    resource: "payments",
    resource_id: paymentId,
  });
}
