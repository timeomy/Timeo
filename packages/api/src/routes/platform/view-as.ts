import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { tenantMemberships } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { success, error } from "../../lib/response.js";
import { getClientIp, insertAudit } from "./helpers.js";

const app = new Hono();

const ViewAsSchema = z.object({
  mode: z.enum(["platform", "tenant"]),
  tenantId: z.string().min(1).optional().nullable(),
  role: z.enum(["admin", "staff", "coach", "customer"]).optional().nullable(),
});

const ROLE_POWER: Record<"customer" | "staff" | "coach" | "admin", number> = {
  customer: 1,
  staff: 2,
  coach: 2,
  admin: 3,
};

function normalizeRole(role: string | null | undefined): "customer" | "staff" | "coach" | "admin" {
  if (!role) return "customer";
  if (role === "owner") return "admin";
  if (role === "member") return "customer";
  if (role === "admin" || role === "staff" || role === "coach") return role;
  return "customer";
}

function canAssumeRole(
  baseRole: "customer" | "staff" | "coach" | "admin",
  requestedRole: "customer" | "staff" | "coach" | "admin",
): boolean {
  return ROLE_POWER[baseRole] >= ROLE_POWER[requestedRole];
}

app.post(
  "/",
  authMiddleware,
  zValidator("json", ViewAsSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);
    const isPlatformAdmin = user.role === "platform_admin";

    if (body.mode === "platform") {
      if (!isPlatformAdmin) {
        return c.json(error("FORBIDDEN", "Platform admin required"), 403);
      }

      await insertAudit(
        user.id,
        "platform_admin",
        "view_as.platform",
        "session",
        user.id,
        { mode: "platform" },
        ip,
      );

      return c.json(success({ mode: "platform" }));
    }

    const tenantId = body.tenantId;
    if (!tenantId) {
      return c.json(error("VALIDATION_ERROR", "tenantId is required for tenant mode"), 400);
    }

    const [membership] = await db
      .select({ role: tenantMemberships.role })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, user.id),
          eq(tenantMemberships.status, "active"),
        ),
      )
      .limit(1);

    const membershipRole = normalizeRole(membership?.role);
    const requestedRole = body.role ?? (isPlatformAdmin ? "admin" : membershipRole);

    if (!isPlatformAdmin && !membership) {
      return c.json(error("FORBIDDEN", "No tenant access"), 403);
    }

    if (!isPlatformAdmin && !canAssumeRole(membershipRole, requestedRole)) {
      return c.json(error("FORBIDDEN", "Insufficient role to switch view"), 403);
    }

    await insertAudit(
      user.id,
      isPlatformAdmin ? "platform_admin" : membershipRole,
      "view_as.tenant",
      "tenant",
      tenantId,
      {
        mode: "tenant",
        role: requestedRole,
      },
      ip,
      tenantId,
    );

    return c.json(success({ mode: "tenant", tenantId, role: requestedRole }));
  },
);

export { app as viewAsRouter };
