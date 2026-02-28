import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "@timeo/db";
import { payments, subscriptions, auditLogs } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { error } from "../../lib/response.js";

const app = new Hono();

app.post("/", async (c) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return c.json(error("CONFIG_ERROR", "Webhook not configured"), 500);
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return c.json(error("CONFIG_ERROR", "Stripe not configured"), 500);
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json(error("BAD_REQUEST", "Missing Stripe signature"), 400);
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", (err as Error).message);
    return c.json(error("INVALID_SIGNATURE", "Invalid webhook signature"), 400);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db
        .update(payments)
        .set({ status: "succeeded", updated_at: new Date() })
        .where(eq(payments.stripe_payment_intent_id, pi.id));
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db
        .update(payments)
        .set({ status: "failed", updated_at: new Date() })
        .where(eq(payments.stripe_payment_intent_id, pi.id));
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === "active" ? "active" : "past_due";
      await db
        .update(subscriptions)
        .set({
          status,
          current_period_start: new Date(sub.current_period_start * 1000),
          current_period_end: new Date(sub.current_period_end * 1000),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.stripe_subscription_id, sub.id));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({ status: "canceled", updated_at: new Date() })
        .where(eq(subscriptions.stripe_subscription_id, sub.id));
      break;
    }

    default:
      // Unhandled event type - log and continue
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return c.json({ received: true });
});

export { app as stripeWebhookRouter };
