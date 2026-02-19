import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { paymentStatusValidator, subscriptionStatusValidator } from "./validators";

// ─── QUERIES ───

export const getPaymentsByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await requireTenantAccess(ctx, order.tenantId);

    return await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .collect();
  },
});

export const getPaymentsByCustomer = query({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const targetCustomerId = args.customerId ?? user._id;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_customer", (q) => q.eq("customerId", targetCustomerId))
      .order("desc")
      .collect();

    return payments.filter((p) => p.tenantId === args.tenantId);
  },
});

export const getSubscription = query({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const targetCustomerId = args.customerId ?? user._id;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("customerId", targetCustomerId))
      .collect();

    return subscriptions.find(
      (s) => s.tenantId === args.tenantId && (s.status === "active" || s.status === "past_due")
    ) ?? null;
  },
});

export const listSubscriptions = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    return await Promise.all(
      subs.map(async (s) => {
        const customer = await ctx.db.get(s.customerId);
        const membership = await ctx.db.get(s.membershipId);
        return {
          ...s,
          customerName: customer?.name ?? "Unknown",
          customerEmail: customer?.email,
          membershipName: membership?.name ?? "Unknown",
        };
      })
    );
  },
});

export const listPaymentsByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    return await Promise.all(
      payments.map(async (p) => {
        const customer = await ctx.db.get(p.customerId);
        return {
          ...p,
          customerName: customer?.name ?? "Unknown",
          customerEmail: customer?.email,
        };
      })
    );
  },
});

export const getStripeAccount = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    return await ctx.db
      .query("stripeAccounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

// ─── MUTATIONS ───

export const createPaymentRecord = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    bookingId: v.optional(v.id("bookings")),
    stripePaymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("payments", {
      tenantId: args.tenantId,
      customerId: args.customerId,
      orderId: args.orderId,
      bookingId: args.bookingId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePaymentStatus = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    status: paymentStatusValidator,
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_stripe_pi", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();

    if (!payment) return null;

    await ctx.db.patch(payment._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return payment;
  },
});

export const confirmOrderPayment = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    if (order.status === "awaiting_payment" || order.status === "pending") {
      await ctx.db.patch(args.orderId, {
        status: "confirmed",
        updatedAt: Date.now(),
      });
    }
  },
});

export const createSubscriptionRecord = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    membershipId: v.id("memberships"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: subscriptionStatusValidator,
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("subscriptions", {
      tenantId: args.tenantId,
      customerId: args.customerId,
      membershipId: args.membershipId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSubscriptionByStripeId = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: subscriptionStatusValidator,
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_sub", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!sub) return null;

    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.currentPeriodStart !== undefined) {
      patch.currentPeriodStart = args.currentPeriodStart;
    }
    if (args.currentPeriodEnd !== undefined) {
      patch.currentPeriodEnd = args.currentPeriodEnd;
    }
    if (args.cancelAtPeriodEnd !== undefined) {
      patch.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
    }

    await ctx.db.patch(sub._id, patch);
    return sub;
  },
});

export const cancelSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Subscription not found");

    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, sub.tenantId);

    if (sub.customerId !== user._id) {
      await requireRole(ctx, sub.tenantId, ["admin"]);
    }

    await ctx.db.patch(args.subscriptionId, {
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });

    return { stripeSubscriptionId: sub.stripeSubscriptionId };
  },
});

export const upsertStripeAccount = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    stripeAccountId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted")
    ),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeAccounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stripeAccountId: args.stripeAccountId,
        status: args.status,
        chargesEnabled: args.chargesEnabled,
        payoutsEnabled: args.payoutsEnabled,
      });
      return existing._id;
    }

    return await ctx.db.insert("stripeAccounts", {
      tenantId: args.tenantId,
      stripeAccountId: args.stripeAccountId,
      status: args.status,
      chargesEnabled: args.chargesEnabled,
      payoutsEnabled: args.payoutsEnabled,
      createdAt: Date.now(),
    });
  },
});

// ─── ACTIONS (call Stripe API) ───

export const createPaymentIntent = action({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    amount: v.number(),
    currency: v.string(),
    customerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currency = (args.currency || "MYR").toUpperCase();

    // Validate minimum amount (RM 2.00 = 200 sen for MYR)
    const minimums: Record<string, number> = { MYR: 200, USD: 50, SGD: 50 };
    const minAmount = minimums[currency] ?? 200;
    if (args.amount < minAmount) {
      throw new Error(
        `Minimum payment amount is ${(minAmount / 100).toFixed(2)} ${currency}`
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia",
    });

    // Check if tenant has a connected account for destination charges
    const stripeAccount = await ctx.runQuery(
      internal.payments.getStripeAccountInternal,
      { tenantId: args.tenantId }
    );

    const paymentIntentParams: Record<string, unknown> = {
      amount: args.amount,
      currency: currency.toLowerCase(),
      // Malaysian payment methods: card, FPX (online banking), GrabPay
      payment_method_types: ["card", "fpx", "grabpay"],
      metadata: {
        tenantId: args.tenantId,
        orderId: args.orderId,
        customerId: args.customerId,
      },
    };

    // If tenant has Stripe Connect, use destination charges
    if (stripeAccount?.chargesEnabled && stripeAccount.stripeAccountId) {
      paymentIntentParams.transfer_data = {
        destination: stripeAccount.stripeAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams as any
    );

    // Record payment in database
    await ctx.runMutation(internal.payments.createPaymentRecordInternal, {
      tenantId: args.tenantId,
      customerId: args.customerId,
      orderId: args.orderId,
      stripePaymentIntentId: paymentIntent.id,
      amount: args.amount,
      currency,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  },
});

export const createCheckoutSession = action({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    membershipId: v.id("memberships"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia",
    });

    const membership = await ctx.runQuery(
      internal.payments.getMembershipInternal,
      { membershipId: args.membershipId }
    );

    if (!membership) throw new Error("Membership not found");

    // Create or retrieve Stripe price for this membership
    const price = await stripe.prices.create({
      unit_amount: membership.price,
      currency: membership.currency.toLowerCase(),
      recurring: {
        interval: membership.interval === "yearly" ? "year" : "month",
      },
      product_data: {
        name: membership.name,
        metadata: {
          tenantId: args.tenantId,
          membershipId: args.membershipId,
        },
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Card and FPX for recurring subscriptions in Malaysia
      payment_method_types: ["card", "fpx"],
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        tenantId: args.tenantId,
        customerId: args.customerId,
        membershipId: args.membershipId,
      },
      subscription_data: {
        metadata: {
          tenantId: args.tenantId,
          customerId: args.customerId,
          membershipId: args.membershipId,
        },
      },
    });

    return { url: session.url!, sessionId: session.id };
  },
});

export const refundPayment = action({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia",
    });

    const payment = await ctx.runQuery(
      internal.payments.getPaymentInternal,
      { paymentId: args.paymentId }
    );

    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "succeeded") {
      throw new Error("Can only refund succeeded payments");
    }

    await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
    });

    await ctx.runMutation(internal.payments.updatePaymentStatus, {
      stripePaymentIntentId: payment.stripePaymentIntentId,
      status: "refunded",
    });

    return { success: true };
  },
});

export const createConnectAccount = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia",
    });

    const tenant = await ctx.runQuery(
      internal.payments.getTenantInternal,
      { tenantId: args.tenantId }
    );

    if (!tenant) throw new Error("Tenant not found");

    const account = await stripe.accounts.create({
      type: "standard",
      metadata: { tenantId: args.tenantId },
    });

    await ctx.runMutation(internal.payments.upsertStripeAccount, {
      tenantId: args.tenantId,
      stripeAccountId: account.id,
      status: "pending",
      chargesEnabled: false,
      payoutsEnabled: false,
    });

    return { accountId: account.id };
  },
});

export const getConnectOnboardingLink = action({
  args: {
    tenantId: v.id("tenants"),
    refreshUrl: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia",
    });

    const stripeAccount = await ctx.runQuery(
      internal.payments.getStripeAccountInternal,
      { tenantId: args.tenantId }
    );

    if (!stripeAccount) {
      throw new Error("No Stripe account found. Create one first.");
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.stripeAccountId,
      refresh_url: args.refreshUrl,
      return_url: args.returnUrl,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  },
});

// ─── INTERNAL QUERIES (used by actions) ───

export const getStripeAccountInternal = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stripeAccounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getPaymentInternal = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

export const getMembershipInternal = query({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.membershipId);
  },
});

export const getTenantInternal = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tenantId);
  },
});

export const createPaymentRecordInternal = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    bookingId: v.optional(v.id("bookings")),
    stripePaymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("payments", {
      tenantId: args.tenantId,
      customerId: args.customerId,
      orderId: args.orderId,
      bookingId: args.bookingId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});
