import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireTenantAccess } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { membershipIntervalValidator } from "./validators";

export const listPublic = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { membership } = await requireTenantAccess(ctx, args.tenantId);

    if (membership.role === "customer") {
      return await ctx.db
        .query("memberships")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }

    return await ctx.db
      .query("memberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    interval: membershipIntervalValidator,
    features: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const membershipId = await ctx.db.insert("memberships", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      price: args.price,
      currency: args.currency ?? "MYR",
      interval: args.interval,
      features: args.features,
      isActive: true,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "membership.created",
      resource: "memberships",
      resourceId: membershipId,
    });

    return membershipId;
  },
});

export const update = mutation({
  args: {
    membershipId: v.id("memberships"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    interval: v.optional(membershipIntervalValidator),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership plan not found");

    const { user } = await requireRole(ctx, membership.tenantId, ["admin"]);

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.interval !== undefined) updates.interval = args.interval;
    if (args.features !== undefined) updates.features = args.features;

    await ctx.db.patch(args.membershipId, updates);

    await insertAuditLog(ctx, {
      tenantId: membership.tenantId,
      actorId: user._id,
      action: "membership.updated",
      resource: "memberships",
      resourceId: args.membershipId,
      metadata: { fields: Object.keys(updates) },
    });
  },
});

export const toggleActive = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership plan not found");

    const { user } = await requireRole(ctx, membership.tenantId, ["admin"]);

    await ctx.db.patch(args.membershipId, {
      isActive: !membership.isActive,
    });

    await insertAuditLog(ctx, {
      tenantId: membership.tenantId,
      actorId: user._id,
      action: membership.isActive
        ? "membership.deactivated"
        : "membership.activated",
      resource: "memberships",
      resourceId: args.membershipId,
    });
  },
});
