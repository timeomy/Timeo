import { Hono } from "hono";
import { db } from "@timeo/db";
import { payments } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { error } from "../../lib/response.js";
import { emitToTenant, emitToUser } from "../../realtime/socket.js";
import * as RMService from "../../services/revenue-monster.service.js";

const app = new Hono();

/**
 * POST /webhooks/revenue-monster
 *
 * Revenue Monster sends payment status updates here.
 * Verifies webhook signature, updates payment record, emits Socket.io event.
 */
app.post("/", async (c) => {
  if (!RMService.isConfigured()) {
    return c.json(error("CONFIG_ERROR", "Revenue Monster not configured"), 500);
  }

  const signature = c.req.header("x-signature") ?? "";
  if (!signature) {
    return c.json(error("BAD_REQUEST", "Missing x-signature header"), 400);
  }

  const rawBody = await c.req.text();

  // Verify webhook authenticity
  const isValid = RMService.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.error("RM webhook signature verification failed");
    return c.json(error("INVALID_SIGNATURE", "Invalid webhook signature"), 400);
  }

  let payload: {
    eventType?: string;
    data?: {
      transactionId?: string;
      order?: { id?: string; amount?: number };
      status?: string;
      type?: string;
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json(error("BAD_REQUEST", "Invalid JSON payload"), 400);
  }

  const data = payload.data;
  if (!data) {
    return c.json(error("BAD_REQUEST", "Missing data in webhook payload"), 400);
  }

  const rmOrderId = data.order?.id ?? data.transactionId;
  if (!rmOrderId) {
    return c.json(error("BAD_REQUEST", "Missing order ID in webhook"), 400);
  }

  // Find the payment record by RM order ID
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.rm_order_id, rmOrderId))
    .limit(1);

  if (!payment) {
    console.warn(`RM webhook: no payment found for rm_order_id=${rmOrderId}`);
    // Return 200 to avoid RM retrying for unknown payments
    return c.json({ received: true });
  }

  // Map RM status to our payment status
  const statusMap: Record<string, "processing" | "succeeded" | "failed" | "refunded"> = {
    SUCCESS: "succeeded",
    FAILED: "failed",
    REVERSED: "refunded",
    REFUNDED: "refunded",
    FULL_REFUNDED: "refunded",
    IN_PROCESS: "processing",
  };

  const rmStatus = data.status ?? "";
  const newStatus = statusMap[rmStatus];

  if (newStatus && payment.status !== newStatus) {
    await db
      .update(payments)
      .set({
        status: newStatus,
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          rm_transaction_id: data.transactionId,
          rm_status: rmStatus,
          rm_method: data.type,
          rm_webhook_at: new Date().toISOString(),
        },
        updated_at: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Emit real-time update to tenant dashboard
    emitToTenant(payment.tenant_id, "payment:updated", {
      paymentId: payment.id,
      status: newStatus,
      amount: payment.amount,
      rmOrderId,
    });

    // Notify the customer
    emitToUser(payment.customer_id, "payment:updated", {
      paymentId: payment.id,
      status: newStatus,
      amount: payment.amount,
    });
  }

  return c.json({ received: true });
});

export { app as revenueMonsterWebhookRouter };
