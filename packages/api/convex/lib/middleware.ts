import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const ROLE_RANK: Record<string, number> = {
  platform_admin: 4,
  admin: 3,
  staff: 2,
  customer: 1,
};

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

  // Use .first() — a user may have multiple memberships for the same tenant
  // (e.g. platform_admin + customer). Pick the highest-privilege active one.
  const memberships = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id)
    )
    .collect();

  const activeMemberships = memberships.filter((m) => m.status === "active");
  if (activeMemberships.length === 0) {
    throw new Error("No access to this tenant");
  }

  activeMemberships.sort(
    (a, b) => (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0)
  );

  return { user, membership: activeMemberships[0] };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  roles: Array<"customer" | "staff" | "admin" | "platform_admin">
) {
  const { user, membership } = await requireTenantAccess(ctx, tenantId);

  // Hierarchy check: user's role must be >= the minimum required role
  const userRank = ROLE_RANK[membership.role] ?? 0;
  const minRequiredRank = Math.min(...roles.map((r) => ROLE_RANK[r] ?? 0));

  if (userRank < minRequiredRank) {
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
