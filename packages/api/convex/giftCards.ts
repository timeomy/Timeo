import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticateUser, requireRole } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GC-";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 3) code += "-";
  }
  return code;
}

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("depleted"),
        v.literal("expired"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    let cards;
    if (args.status) {
      cards = await ctx.db
        .query("giftCards")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      cards = await ctx.db
        .query("giftCards")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .collect();
    }

    return cards;
  },
});

export const getByCode = query({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!card || card.tenantId !== args.tenantId) return null;

    return card;
  },
});

export const validateCode = query({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!card || card.tenantId !== args.tenantId) {
      return { valid: false, reason: "Gift card not found" };
    }
    if (card.status !== "active") {
      return {
        valid: false,
        reason:
          card.status === "depleted"
            ? "Gift card has no remaining balance"
            : card.status === "expired"
              ? "Gift card has expired"
              : "Gift card has been cancelled",
      };
    }
    if (card.expiresAt && card.expiresAt < Date.now()) {
      return { valid: false, reason: "Gift card has expired" };
    }
    if (card.currentBalance <= 0) {
      return { valid: false, reason: "Gift card has no remaining balance" };
    }

    return {
      valid: true,
      card: {
        _id: card._id,
        code: card.code,
        currentBalance: card.currentBalance,
        currency: card.currency,
      },
    };
  },
});

export const getTransactions = query({
  args: { giftCardId: v.id("giftCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.giftCardId);
    if (!card) return [];

    await requireRole(ctx, card.tenantId, ["admin", "staff"]);

    return await ctx.db
      .query("giftCardTransactions")
      .withIndex("by_gift_card", (q) => q.eq("giftCardId", args.giftCardId))
      .order("desc")
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    initialBalance: v.number(),
    currency: v.optional(v.string()),
    purchaserName: v.optional(v.string()),
    purchaserEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    // Generate unique code
    let code = generateGiftCardCode();
    let existing = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    while (existing) {
      code = generateGiftCardCode();
      existing = await ctx.db
        .query("giftCards")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const cardId = await ctx.db.insert("giftCards", {
      tenantId: args.tenantId,
      code,
      initialBalance: args.initialBalance,
      currentBalance: args.initialBalance,
      currency: args.currency ?? "MYR",
      purchaserName: args.purchaserName,
      purchaserEmail: args.purchaserEmail,
      recipientName: args.recipientName,
      recipientEmail: args.recipientEmail,
      message: args.message,
      status: "active",
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    // Record purchase transaction
    await ctx.db.insert("giftCardTransactions", {
      giftCardId: cardId,
      tenantId: args.tenantId,
      type: "purchase",
      amount: args.initialBalance,
      balanceAfter: args.initialBalance,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "giftcard.created",
      resource: "giftCards",
      resourceId: cardId,
      metadata: {
        code,
        amount: args.initialBalance,
        recipientName: args.recipientName,
      },
    });

    return { cardId, code };
  },
});

export const redeem = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    amount: v.number(),
    posTransactionId: v.optional(v.id("posTransactions")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!card || card.tenantId !== args.tenantId) {
      throw new Error("Gift card not found");
    }
    if (card.status !== "active") {
      throw new Error("Gift card is not active");
    }
    if (card.expiresAt && card.expiresAt < Date.now()) {
      throw new Error("Gift card has expired");
    }
    if (card.currentBalance < args.amount) {
      throw new Error(
        `Insufficient balance. Available: ${card.currentBalance}, Requested: ${args.amount}`
      );
    }

    const newBalance = card.currentBalance - args.amount;

    await ctx.db.patch(card._id, {
      currentBalance: newBalance,
      status: newBalance <= 0 ? "depleted" : "active",
    });

    await ctx.db.insert("giftCardTransactions", {
      giftCardId: card._id,
      tenantId: args.tenantId,
      type: "redemption",
      amount: args.amount,
      balanceAfter: newBalance,
      posTransactionId: args.posTransactionId,
      note: args.note,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "giftcard.redeemed",
      resource: "giftCards",
      resourceId: card._id,
      metadata: {
        code: card.code,
        amount: args.amount,
        newBalance,
      },
    });

    return { newBalance };
  },
});

export const topup = mutation({
  args: {
    giftCardId: v.id("giftCards"),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.giftCardId);
    if (!card) throw new Error("Gift card not found");

    const { user } = await requireRole(ctx, card.tenantId, ["admin"]);

    const newBalance = card.currentBalance + args.amount;

    await ctx.db.patch(args.giftCardId, {
      currentBalance: newBalance,
      status: "active",
    });

    await ctx.db.insert("giftCardTransactions", {
      giftCardId: args.giftCardId,
      tenantId: card.tenantId,
      type: "topup",
      amount: args.amount,
      balanceAfter: newBalance,
      note: args.note,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: card.tenantId,
      actorId: user._id,
      action: "giftcard.topup",
      resource: "giftCards",
      resourceId: args.giftCardId,
      metadata: { code: card.code, amount: args.amount, newBalance },
    });
  },
});

export const cancel = mutation({
  args: { giftCardId: v.id("giftCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.giftCardId);
    if (!card) throw new Error("Gift card not found");

    const { user } = await requireRole(ctx, card.tenantId, ["admin"]);

    await ctx.db.patch(args.giftCardId, { status: "cancelled" });

    await insertAuditLog(ctx, {
      tenantId: card.tenantId,
      actorId: user._id,
      action: "giftcard.cancelled",
      resource: "giftCards",
      resourceId: args.giftCardId,
      metadata: {
        code: card.code,
        remainingBalance: card.currentBalance,
      },
    });
  },
});

export const remove = mutation({
  args: { giftCardId: v.id("giftCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.giftCardId);
    if (!card) throw new Error("Gift card not found");

    const { user } = await requireRole(ctx, card.tenantId, ["admin"]);

    // Delete all transactions for this card
    const transactions = await ctx.db
      .query("giftCardTransactions")
      .withIndex("by_gift_card", (q) => q.eq("giftCardId", args.giftCardId))
      .collect();
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(args.giftCardId);

    await insertAuditLog(ctx, {
      tenantId: card.tenantId,
      actorId: user._id,
      action: "giftcard.deleted",
      resource: "giftCards",
      resourceId: args.giftCardId,
      metadata: {
        code: card.code,
        remainingBalance: card.currentBalance,
      },
    });
  },
});

export const reactivate = mutation({
  args: { giftCardId: v.id("giftCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.giftCardId);
    if (!card) throw new Error("Gift card not found");

    const { user } = await requireRole(ctx, card.tenantId, ["admin"]);

    if (card.currentBalance <= 0) {
      throw new Error("Cannot reactivate a gift card with zero balance");
    }

    await ctx.db.patch(args.giftCardId, { status: "active" });

    await insertAuditLog(ctx, {
      tenantId: card.tenantId,
      actorId: user._id,
      action: "giftcard.reactivated",
      resource: "giftCards",
      resourceId: args.giftCardId,
      metadata: { code: card.code },
    });
  },
});
