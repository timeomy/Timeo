import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function authenticateUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found. Please complete registration.");
  }

  return user;
}

export async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">
) {
  const user = await authenticateUser(ctx);

  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id)
    )
    .unique();

  if (!membership || membership.status !== "active") {
    throw new Error("No access to this tenant");
  }

  return { user, membership };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  roles: Array<"customer" | "staff" | "admin" | "platform_admin">
) {
  const { user, membership } = await requireTenantAccess(ctx, tenantId);

  if (!roles.includes(membership.role)) {
    throw new Error(
      `Insufficient permissions. Required: ${roles.join(" or ")}`
    );
  }

  return { user, membership };
}

export async function requirePlatformAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authenticateUser(ctx);

  const adminMembership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("role"), "platform_admin"))
    .first();

  if (!adminMembership) {
    throw new Error("Platform admin access required");
  }

  return user;
}
