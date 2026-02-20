import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { voucherTypeValidator } from "./validators";

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    return await ctx.db
      .query("vouchers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

export const getByCode = query({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId);

    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher || voucher.tenantId !== args.tenantId) {
      return null;
    }

    return voucher;
  },
});

export const validateCode = query({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId);

    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher || voucher.tenantId !== args.tenantId) {
      return { valid: false, reason: "Voucher not found" };
    }
    if (!voucher.isActive) {
      return { valid: false, reason: "Voucher is no longer active" };
    }
    if (voucher.expiresAt && voucher.expiresAt < Date.now()) {
      return { valid: false, reason: "Voucher has expired" };
    }
    if (voucher.maxUses && voucher.usedCount >= voucher.maxUses) {
      return { valid: false, reason: "Voucher has been fully redeemed" };
    }

    return {
      valid: true,
      voucher: {
        _id: voucher._id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
      },
    };
  },
});

export const listRedemptions = query({
  args: {
    tenantId: v.id("tenants"),
    voucherId: v.optional(v.id("vouchers")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    let redemptions;
    if (args.voucherId) {
      redemptions = await ctx.db
        .query("voucherRedemptions")
        .withIndex("by_voucher", (q) => q.eq("voucherId", args.voucherId!))
        .order("desc")
        .collect();
    } else {
      redemptions = await ctx.db
        .query("voucherRedemptions")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .take(100);
    }

    return await Promise.all(
      redemptions.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        const voucher = await ctx.db.get(r.voucherId);
        return {
          ...r,
          userName: user?.name ?? "Unknown",
          voucherCode: voucher?.code ?? "Unknown",
        };
      })
    );
  },
});

export const getMyVouchers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const redemptions = await ctx.db
      .query("voucherRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const filtered = redemptions.filter((r) => r.tenantId === args.tenantId);

    return await Promise.all(
      filtered.map(async (r) => {
        const voucher = await ctx.db.get(r.voucherId);
        return {
          ...r,
          voucherCode: voucher?.code ?? "Unknown",
          voucherType: voucher?.type,
          voucherValue: voucher?.value,
        };
      })
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    type: voucherTypeValidator,
    value: v.number(),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const normalizedCode = args.code.toUpperCase().trim();

    // Check for duplicate code
    const existing = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing && existing.tenantId === args.tenantId) {
      throw new Error("A voucher with this code already exists");
    }

    const voucherId = await ctx.db.insert("vouchers", {
      tenantId: args.tenantId,
      code: normalizedCode,
      type: args.type,
      value: args.value,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "voucher.created",
      resource: "vouchers",
      resourceId: voucherId,
      metadata: { code: normalizedCode, type: args.type, value: args.value },
    });

    return voucherId;
  },
});

export const update = mutation({
  args: {
    voucherId: v.id("vouchers"),
    value: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.voucherId);
    if (!voucher) throw new Error("Voucher not found");

    const { user } = await requireRole(ctx, voucher.tenantId, ["admin"]);

    const updates: Record<string, unknown> = {};
    if (args.value !== undefined) updates.value = args.value;
    if (args.maxUses !== undefined) updates.maxUses = args.maxUses;
    if (args.expiresAt !== undefined) updates.expiresAt = args.expiresAt;

    await ctx.db.patch(args.voucherId, updates);

    await insertAuditLog(ctx, {
      tenantId: voucher.tenantId,
      actorId: user._id,
      action: "voucher.updated",
      resource: "vouchers",
      resourceId: args.voucherId,
    });
  },
});

export const toggleActive = mutation({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.voucherId);
    if (!voucher) throw new Error("Voucher not found");

    const { user } = await requireRole(ctx, voucher.tenantId, ["admin"]);

    await ctx.db.patch(args.voucherId, { isActive: !voucher.isActive });

    await insertAuditLog(ctx, {
      tenantId: voucher.tenantId,
      actorId: user._id,
      action: voucher.isActive ? "voucher.deactivated" : "voucher.activated",
      resource: "vouchers",
      resourceId: args.voucherId,
    });
  },
});

export const redeem = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    bookingId: v.optional(v.id("bookings")),
    orderId: v.optional(v.id("orders")),
    originalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher || voucher.tenantId !== args.tenantId) {
      throw new Error("Voucher not found");
    }
    if (!voucher.isActive) {
      throw new Error("Voucher is no longer active");
    }
    if (voucher.expiresAt && voucher.expiresAt < Date.now()) {
      throw new Error("Voucher has expired");
    }
    if (voucher.maxUses && voucher.usedCount >= voucher.maxUses) {
      throw new Error("Voucher has been fully redeemed");
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.type === "percentage") {
      discountAmount = Math.round((args.originalAmount * voucher.value) / 100);
    } else if (voucher.type === "fixed") {
      discountAmount = Math.min(voucher.value, args.originalAmount);
    } else if (voucher.type === "free_session") {
      discountAmount = args.originalAmount; // Full discount
    }

    // Record redemption
    const redemptionId = await ctx.db.insert("voucherRedemptions", {
      tenantId: args.tenantId,
      voucherId: voucher._id,
      userId: user._id,
      discountAmount,
      bookingId: args.bookingId,
      orderId: args.orderId,
      redeemedAt: Date.now(),
    });

    // Increment usage count
    await ctx.db.patch(voucher._id, {
      usedCount: voucher.usedCount + 1,
    });

    return { redemptionId, discountAmount };
  },
});
