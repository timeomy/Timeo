import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requirePlatformAdmin,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import {
  tenantPlanValidator,
  tenantStatusValidator,
  tenantSettingsValidator,
  tenantBrandingValidator,
} from "./validators";

export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (!tenant) return null;
    return tenant;
  },
});

export const createFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create user from Clerk identity
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: identity.email ?? "",
        name: identity.name ?? identity.email ?? "User",
        avatarUrl: identity.pictureUrl,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
    }

    // Check if tenant already exists for this Clerk org
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (existing) return existing._id;

    // Check slug uniqueness
    const slugExists = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (slugExists) throw new Error("Slug already taken");

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      clerkOrgId: args.clerkOrgId,
      ownerId: user._id,
      plan: "free",
      status: "active",
      settings: {
        timezone: "Asia/Kuala_Lumpur",
        autoConfirmBookings: false,
      },
      branding: {},
      createdAt: Date.now(),
    });

    await ctx.db.insert("tenantMemberships", {
      userId: user._id,
      tenantId,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId,
      actorId: user._id,
      action: "tenant.created",
      resource: "tenants",
      resourceId: tenantId,
    });

    return tenantId;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!tenant) return null;
    return {
      _id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      branding: tenant.branding,
    };
  },
});

export const getById = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await authenticateUser(ctx);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");
    return tenant;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db.query("tenants").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    plan: tenantPlanValidator,
    settings: v.optional(tenantSettingsValidator),
    branding: v.optional(tenantBrandingValidator),
  },
  handler: async (ctx, args) => {
    const user = await requirePlatformAdmin(ctx);

    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Tenant slug already taken");

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      ownerId: user._id,
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
      userId: user._id,
      tenantId,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId,
      actorId: user._id,
      action: "tenant.created",
      resource: "tenants",
      resourceId: tenantId,
    });

    return tenantId;
  },
});

export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    settings: v.optional(tenantSettingsValidator),
    plan: v.optional(tenantPlanValidator),
    status: v.optional(tenantStatusValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.settings !== undefined) updates.settings = args.settings;
    if (args.plan !== undefined) updates.plan = args.plan;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.tenantId, updates);

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "tenant.updated",
      resource: "tenants",
      resourceId: args.tenantId,
      metadata: { fields: Object.keys(updates) },
    });
  },
});

export const updateBranding = mutation({
  args: {
    tenantId: v.id("tenants"),
    branding: tenantBrandingValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    await ctx.db.patch(args.tenantId, { branding: args.branding });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "tenant.branding_updated",
      resource: "tenants",
      resourceId: args.tenantId,
    });
  },
});
