import type { Context, Next } from "hono";
import { db } from "@timeo/db";
import { tenantMemberships } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";

type Role = "customer" | "staff" | "admin" | "platform_admin";

const ROLE_RANK: Record<Role, number> = {
  platform_admin: 4,
  admin: 3,
  staff: 2,
  customer: 1,
};

export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");

    if (!user || !tenantId) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        401,
      );
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

    const userRank = ROLE_RANK[membership.role as Role] ?? 0;
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
