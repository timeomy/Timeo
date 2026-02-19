import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePlatformAdmin } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import {
  tenantPlanValidator,
  tenantSettingsValidator,
  tenantBrandingValidator,
} from "./validators";

export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const config = await ctx.db
      .query("platformConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return config;
  },
});

export const listFeatureFlags = query({
  args: { tenantId: v.optional(v.id("tenants")) },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    if (args.tenantId) {
      return await ctx.db
        .query("featureFlags")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    return await ctx.db.query("featureFlags").collect();
  },
});

export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === "active").length,
      totalUsers: users.length,
      pendingBookings: bookings.length,
      pendingOrders: orders.length,
      timestamp: Date.now(),
    };
  },
});

export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requirePlatformAdmin(ctx);

    const existing = await ctx.db
      .query("platformConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformConfig", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }

    await insertAuditLog(ctx, {
      actorId: user._id,
      action: "platform.config_set",
      resource: "platformConfig",
      resourceId: args.key,
    });
  },
});

export const setFeatureFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
    tenantId: v.optional(v.id("tenants")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requirePlatformAdmin(ctx);

    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .filter((q) =>
        args.tenantId
          ? q.eq(q.field("tenantId"), args.tenantId)
          : q.eq(q.field("tenantId"), undefined)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        metadata: args.metadata,
      });
    } else {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        tenantId: args.tenantId,
        enabled: args.enabled,
        metadata: args.metadata,
      });
    }

    await insertAuditLog(ctx, {
      actorId: user._id,
      action: "platform.feature_flag_set",
      resource: "featureFlags",
      resourceId: args.key,
      metadata: { enabled: args.enabled, tenantId: args.tenantId },
    });
  },
});

export const createTenant = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    plan: tenantPlanValidator,
    settings: v.optional(tenantSettingsValidator),
    branding: v.optional(tenantBrandingValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requirePlatformAdmin(ctx);

    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Tenant slug already taken");

    const owner = await ctx.db.get(args.ownerId);
    if (!owner) throw new Error("Owner user not found");

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      ownerId: args.ownerId,
      plan: args.plan,
      status: "active",
      settings: args.settings ?? {
        timezone: "Asia/Kuala_Lumpur",
        autoConfirmBookings: false,
      },
      branding: args.branding ?? {},
      createdAt: Date.now(),
    });

    await ctx.db.insert("tenantMemberships", {
      userId: args.ownerId,
      tenantId,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId,
      actorId: admin._id,
      action: "platform.tenant_created",
      resource: "tenants",
      resourceId: tenantId,
      metadata: { ownerId: args.ownerId, plan: args.plan },
    });

    return tenantId;
  },
});
