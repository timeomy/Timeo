import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});

/**
 * Public mutation: ensures the authenticated Clerk user has a corresponding
 * Convex user record. Creates one if missing, updates fields if changed.
 * Should be called early in any layout/page so queries like bookings.listByCustomer
 * never hit "User not found".
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 1. Check if user already linked by Clerk ID
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      // Sync fields if they changed
      const updates: Record<string, unknown> = {};
      const name = identity.name ?? identity.email ?? "User";
      if (existing.email !== (identity.email ?? "")) updates.email = identity.email ?? "";
      if (existing.name !== name) updates.name = name;
      if (existing.avatarUrl !== identity.pictureUrl) updates.avatarUrl = identity.pictureUrl;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    // 2. Check for legacy user by email — link their account instead of creating a duplicate.
    //    Legacy users have clerkId like "legacy_wsf_..." from data imports.
    if (identity.email) {
      const legacyUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      if (legacyUser && legacyUser.clerkId.startsWith("legacy_")) {
        // Link legacy account to real Clerk identity
        await ctx.db.patch(legacyUser._id, {
          clerkId: identity.subject,
          name: identity.name ?? legacyUser.name,
          avatarUrl: identity.pictureUrl ?? legacyUser.avatarUrl,
        });
        return legacyUser._id;
      }
    }

    // 3. Brand new user — create fresh record
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.email ?? "User",
      avatarUrl: identity.pictureUrl,
      createdAt: Date.now(),
    });
  },
});

/**
 * Ensures the authenticated user has a tenantMembership for the given tenant.
 * Creates a "customer" membership if none exists. Idempotent — safe to call repeatedly.
 */
export const ensureMembership = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", user._id)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("tenantMemberships", {
      userId: user._id,
      tenantId: args.tenantId,
      role: "customer",
      status: "active",
      joinedAt: Date.now(),
    });
  },
});

/**
 * Non-throwing query that checks if the current user exists AND has an active
 * membership for the given tenant. Returns { ready: true, role } when access
 * is confirmed, or { ready: false } otherwise. Portal pages gate their
 * data-fetching queries on `ready` so they never hit requireTenantAccess
 * before the membership is created.
 */
export const checkAccess = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ready: false as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { ready: false as const };

    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", user._id)
      )
      .collect();

    const active = memberships.find((m) => m.status === "active");
    if (!active) {
      return { ready: false as const };
    }

    return { ready: true as const, role: active.role };
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.patch(membership._id, { status: "suspended" });
    }

    await ctx.db.delete(user._id);
  },
});
