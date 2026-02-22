import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { memberRoleValidator } from "./validators";


export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          userAvatarUrl: user?.avatarUrl,
        };
      })
    );

    return enriched;
  },
});

export const getMyMembership = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    const membership = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", user._id)
      )
      .unique();
    return membership;
  },
});

export const invite = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    role: memberRoleValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .unique();
    if (existing) throw new Error("User already has a membership in this tenant");

    const membershipId = await ctx.db.insert("tenantMemberships", {
      userId: args.userId,
      tenantId: args.tenantId,
      role: args.role,
      status: "invited",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "membership.invited",
      resource: "tenantMemberships",
      resourceId: membershipId,
      metadata: { invitedUserId: args.userId, role: args.role },
    });

    // Send invitation notification
    await ctx.scheduler.runAfter(
      0,
      internal.actions.notifications.sendStaffInvitation,
      {
        invitedUserId: args.userId,
        tenantId: args.tenantId,
        inviterName: user.name,
        role: args.role,
      }
    );

    return membershipId;
  },
});

export const updateRole = mutation({
  args: {
    tenantId: v.id("tenants"),
    membershipId: v.id("tenantMemberships"),
    role: memberRoleValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.tenantId !== args.tenantId) {
      throw new Error("Membership not found in this tenant");
    }

    const oldRole = membership.role;
    await ctx.db.patch(args.membershipId, { role: args.role });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "membership.role_updated",
      resource: "tenantMemberships",
      resourceId: args.membershipId,
      metadata: { oldRole, newRole: args.role },
    });

  },
});

export const suspend = mutation({
  args: {
    tenantId: v.id("tenants"),
    membershipId: v.id("tenantMemberships"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.tenantId !== args.tenantId) {
      throw new Error("Membership not found in this tenant");
    }
    if (membership.userId === user._id) {
      throw new Error("Cannot suspend yourself");
    }

    await ctx.db.patch(args.membershipId, { status: "suspended" });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "membership.suspended",
      resource: "tenantMemberships",
      resourceId: args.membershipId,
    });
  },
});

export const inviteByEmail = mutation({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    role: memberRoleValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!targetUser) {
      throw new Error(
        "No user found with that email. They must sign up first before being invited."
      );
    }

    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", targetUser._id)
      )
      .unique();
    if (existing) throw new Error("User already has a membership in this tenant");

    const membershipId = await ctx.db.insert("tenantMemberships", {
      userId: targetUser._id,
      tenantId: args.tenantId,
      role: args.role,
      status: "invited",
      joinedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "membership.invited",
      resource: "tenantMemberships",
      resourceId: membershipId,
      metadata: { invitedUserId: targetUser._id, role: args.role },
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.notifications.sendStaffInvitation,
      {
        invitedUserId: targetUser._id,
        tenantId: args.tenantId,
        inviterName: user.name,
        role: args.role,
      }
    );

    return membershipId;
  },
});

export const join = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);

    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", user._id)
      )
      .unique();

    if (existing && existing.status === "invited") {
      await ctx.db.patch(existing._id, {
        status: "active",
        joinedAt: Date.now(),
      });
      return existing._id;
    }

    if (existing) throw new Error("Already a member of this tenant");

    const membershipId = await ctx.db.insert("tenantMemberships", {
      userId: user._id,
      tenantId: args.tenantId,
      role: "customer",
      status: "active",
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});
