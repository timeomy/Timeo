import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const handleStripeWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify webhook signature
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const payment = await ctx.runMutation(
        internal.payments.updatePaymentStatus,
        {
          stripePaymentIntentId: pi.id,
          status: "succeeded",
        }
      );

      // If payment is linked to an order, confirm the order
      if (payment?.orderId) {
        await ctx.runMutation(internal.payments.confirmOrderPayment, {
          orderId: payment.orderId,
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      await ctx.runMutation(internal.payments.updatePaymentStatus, {
        stripePaymentIntentId: pi.id,
        status: "failed",
      });
      break;
    }

    case "customer.subscription.created": {
      const sub = event.data.object;
      const metadata = sub.metadata;

      if (metadata.tenantId && metadata.customerId && metadata.membershipId) {
        await ctx.runMutation(internal.payments.createSubscriptionRecord, {
          tenantId: metadata.tenantId as any,
          customerId: metadata.customerId as any,
          membershipId: metadata.membershipId as any,
          stripeSubscriptionId: sub.id,
          stripeCustomerId:
            typeof sub.customer === "string"
              ? sub.customer
              : sub.customer.id,
          status: mapSubscriptionStatus(sub.status),
          currentPeriodStart: sub.current_period_start * 1000,
          currentPeriodEnd: sub.current_period_end * 1000,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      await ctx.runMutation(internal.payments.updateSubscriptionByStripeId, {
        stripeSubscriptionId: sub.id,
        status: mapSubscriptionStatus(sub.status),
        currentPeriodStart: sub.current_period_start * 1000,
        currentPeriodEnd: sub.current_period_end * 1000,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await ctx.runMutation(internal.payments.updateSubscriptionByStripeId, {
        stripeSubscriptionId: sub.id,
        status: "canceled",
      });
      break;
    }

    case "account.updated": {
      const account = event.data.object;
      const tenantId = account.metadata?.tenantId;

      if (tenantId) {
        const status = account.charges_enabled
          ? "active"
          : account.requirements?.disabled_reason
            ? "restricted"
            : "pending";

        await ctx.runMutation(internal.payments.upsertStripeAccount, {
          tenantId: tenantId as any,
          stripeAccountId: account.id,
          status,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
        });
      }
      break;
    }

    default:
      // Unhandled event type - log and acknowledge
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

function mapSubscriptionStatus(
  stripeStatus: string
): "active" | "past_due" | "canceled" | "incomplete" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "incomplete";
  }
}
