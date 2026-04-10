import type { Context, Next } from "hono";
import { db } from "@timeo/db";
import { tenantMemberships } from "@timeo/db/schema";
import { hasCapability, normalizeRole, type Capability, type Role } from "@timeo/shared";
import { and, eq } from "drizzle-orm";

const ROLE_RANK: Record<Role, number> = {
  platform_admin: 4,
  admin: 3,
  staff: 2,
  coach: 2,
  customer: 1,
};

async function resolveRole(c: Context): Promise<Role | Response> {
  const user = c.get("user");
  const tenantId = c.get("tenantId");
  const tenantRole = c.get("tenantRole") as string | undefined;

  if (!user || !tenantId) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      401,
    );
  }

  if (user.role === "platform_admin") {
    return "platform_admin";
  }

  if (tenantRole) {
    return normalizeRole(tenantRole);
  }

  const [membership] = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "No tenant access" },
      },
      403,
    );
  }

  return normalizeRole(membership.role);
}

export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const resolvedRole = await resolveRole(c);
    if (resolvedRole instanceof Response) {
      return resolvedRole;
    }

    const userRank = ROLE_RANK[resolvedRole] ?? 0;
    const minRank = Math.min(...roles.map((r) => ROLE_RANK[r]));

    if (userRank < minRank) {
      return c.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Requires role: ${roles.join(" or ")}`,
          },
        },
        403,
      );
    }

    await next();
  };
}

export function requireCapability(capability: Capability | string) {
  return async (c: Context, next: Next) => {
    const resolvedRole = await resolveRole(c);
    if (resolvedRole instanceof Response) {
      return resolvedRole;
    }

    if (!hasCapability(resolvedRole, capability)) {
      return c.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Missing capability: ${capability}`,
          },
        },
        403,
      );
    }

    await next();
  };
}

export async function requirePlatformAdmin(c: Context, next: Next) {
  const user = c.get("user");
  if (!user) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      401,
    );
  }

  // Check users.role first (platform-level role from users table)
  if (user.role === "platform_admin") {
    await next();
    return;
  }

  // Fallback: check tenant_memberships for legacy platform_admin role
  const [membership] = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.role, "platform_admin"),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    return c.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Platform admin required",
        },
      },
      403,
    );
  }

  await next();
}
