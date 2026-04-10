import { createMiddleware } from "hono/factory";
import { db } from "@timeo/db";
import { tenantMemberships } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { ImpersonationContext } from "./auth.js";

type TenantRole = "customer" | "staff" | "coach" | "admin" | "platform_admin";

const ROLE_POWER: Record<TenantRole, number> = {
  customer: 1,
  staff: 2,
  coach: 2,
  admin: 3,
  platform_admin: 4,
};

function parseCookie(headers: Headers, name: string): string | undefined {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";");
  for (const rawCookie of cookies) {
    const [rawName, ...rawValue] = rawCookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

function normalizeRole(role?: string | null): TenantRole {
  if (!role) return "customer";

  const normalized = role.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "owner") return "admin";
  if (normalized === "member") return "customer";
  if (normalized === "front_desk") return "staff";
  if (normalized === "platform_admin") return "platform_admin";
  if (normalized === "admin") return "admin";
  if (normalized === "staff") return "staff";
  if (normalized === "coach") return "coach";
  return "customer";
}

function canAssumeRole(baseRole: TenantRole, targetRole: TenantRole): boolean {
  if (baseRole === "platform_admin") return true;
  if (targetRole === "platform_admin") return false;
  return ROLE_POWER[baseRole] >= ROLE_POWER[targetRole];
}

export const tenantMiddleware = createMiddleware(async (c, next) => {
  const tenantId = c.req.param("tenantId");
  if (!tenantId) {
    return c.json(
      {
        success: false,
        error: { code: "MISSING_TENANT", message: "tenantId required" },
      },
      400,
    );
  }

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
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .limit(1);

  const isPlatformAdmin = user.role === "platform_admin";

  if (!membership && !isPlatformAdmin) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "No access to this tenant" },
      },
      403,
    );
  }

  const viewRoleHeader = c.req.header("x-timeo-view-role");
  const viewRoleCookie = parseCookie(c.req.raw.headers, "timeo.viewAsRole");
  const viewRoleRaw = viewRoleHeader ?? viewRoleCookie;
  const roleSource: ImpersonationContext["source"] = viewRoleHeader ? "header" : "cookie";
  const requestedRole = viewRoleRaw ? normalizeRole(viewRoleRaw) : null;

  const membershipRole = normalizeRole(
    membership?.role ?? (isPlatformAdmin ? "admin" : "customer"),
  );

  let effectiveRole = membershipRole;
  if (requestedRole && (isPlatformAdmin || canAssumeRole(membershipRole, requestedRole))) {
    effectiveRole = requestedRole;
  }

  c.set("tenantId", tenantId);
  c.set("tenantRole", effectiveRole);

  if (
    isPlatformAdmin &&
    requestedRole &&
    (effectiveRole !== membershipRole || !membership)
  ) {
    c.set("impersonation", {
      actorId: user.id,
      tenantId,
      asRole: effectiveRole === "platform_admin" ? "admin" : effectiveRole,
      source: roleSource,
    });
  }

  // Set RLS context for this request
  await db.execute(
    sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`,
  );

  await next();
});
