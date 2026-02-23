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

/** Create a new tenant during onboarding (replaces createFromClerk) */
export const createForOnboarding = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        authId: identity.subject,
        email: identity.email ?? "",
        name: identity.name ?? identity.email ?? "User",
        avatarUrl: identity.pictureUrl,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
    }

    // Check slug uniqueness
    const slugExists = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (slugExists) throw new Error("Slug already taken");

    // Create new tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
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

/** Returns all tenants the current user is a member of (via Convex memberships) */
export const getMyTenants = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const tenants = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await ctx.db.get(m.tenantId);
        if (!tenant) return null;
        return {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          role: m.role,
        };
      })
    );

    return tenants.filter(Boolean);
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

/** Returns tenants where the current user has an "invited" membership */
export const getMyInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "invited"))
      .collect();

    const tenants = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await ctx.db.get(m.tenantId);
        if (!tenant) return null;
        return {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          role: m.role,
          membershipId: m._id,
        };
      })
    );

    return tenants.filter(Boolean);
  },
});

/** Customer self-join: find a tenant by slug and create a customer membership */
export const joinAsCustomer = mutation({
  args: {
    tenantSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find tenant by slug
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .first();
    if (!tenant) throw new Error(`Business not found: ${args.tenantSlug}`);

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        authId: identity.subject,
        email: identity.email ?? "",
        name: identity.name ?? "Customer",
        avatarUrl: identity.pictureUrl,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenant._id).eq("userId", user!._id)
      )
      .unique();

    if (existing) {
      return { tenantId: tenant._id, name: tenant.name, alreadyMember: true };
    }

    // Create customer membership
    await ctx.db.insert("tenantMemberships", {
      userId: user._id,
      tenantId: tenant._id,
      role: "customer",
      status: "active",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: tenant._id,
      actorId: user._id,
      action: "member.joined",
      resource: "tenantMemberships",
      resourceId: tenant._id,
    });

    return { tenantId: tenant._id, name: tenant.name, alreadyMember: false };
  },
});
