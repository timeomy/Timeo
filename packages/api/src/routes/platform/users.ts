import { Hono } from "hono";
import { z } from "zod";
import { db } from "@timeo/db";
import { users, tenantMemberships, session, account } from "@timeo/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /users — list all users (cross-tenant)
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db
    .select({
      id: users.id,
      auth_id: users.auth_id,
      email: users.email,
      name: users.name,
      avatar_url: users.avatar_url,
      created_at: users.created_at,
      tenant_count: sql<number>`(
        SELECT COUNT(*) FROM tenant_memberships
        WHERE tenant_memberships.user_id = ${users.id}
        AND tenant_memberships.status = 'active'
      )`.as("tenant_count"),
    })
    .from(users)
    .orderBy(desc(users.created_at));

  return c.json(success(rows));
});

// GET /users/:id — user detail + all tenant memberships
app.get("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const id = c.req.param("id");

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!userRow) {
    return c.json(error("NOT_FOUND", "User not found"), 404);
  }

  const memberships = await db
    .select({
      id: tenantMemberships.id,
      tenant_id: tenantMemberships.tenant_id,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      joined_at: tenantMemberships.joined_at,
    })
    .from(tenantMemberships)
    .where(eq(tenantMemberships.user_id, id));

  return c.json(success({ ...userRow, memberships }));
});

// PATCH /users/:id/deactivate — set user inactive across all tenants
app.patch(
  "/:id/deactivate",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");
    const ip = getClientIp(c.req.raw.headers);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Suspend all memberships
    await db
      .update(tenantMemberships)
      .set({ status: "suspended" })
      .where(eq(tenantMemberships.user_id, id));

    await insertAudit(
      actor.id,
      "platform_admin",
      "user.deactivated",
      "user",
      id,
      { email: userRow.email },
      ip,
    );

    return c.json(success({ message: "User deactivated" }));
  },
);

// DELETE /users/:id/sessions — force logout (delete all sessions from DB)
app.delete(
  "/:id/sessions",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");
    const ip = getClientIp(c.req.raw.headers);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow || !userRow.auth_id) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // session.userId references auth user.id, not our users.id
    await db.delete(session).where(eq(session.userId, userRow.auth_id));

    await insertAudit(
      actor.id,
      "platform_admin",
      "user.sessions_revoked",
      "user",
      id,
      { email: userRow.email },
      ip,
    );

    return c.json(success({ message: "All sessions revoked" }));
  },
);

// PATCH /users/:id/activate — reactivate a deactivated user
app.patch(
  "/:id/activate",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");
    const ip = getClientIp(c.req.raw.headers);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Reactivate all memberships
    await db
      .update(tenantMemberships)
      .set({ status: "active" })
      .where(eq(tenantMemberships.user_id, id));

    await insertAudit(
      actor.id,
      "platform_admin",
      "user.activated",
      "user",
      id,
      { email: userRow.email },
      ip,
    );

    return c.json(success({ message: "User activated" }));
  },
);

// PATCH /users/:id/memberships/:membershipId/role — change a user's role for a specific tenant
const changeRoleSchema = z.object({
  role: z.enum(["platform_admin", "admin", "staff", "customer"]),
});

app.patch(
  "/:id/memberships/:membershipId/role",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");
    const membershipId = c.req.param("membershipId");
    const ip = getClientIp(c.req.raw.headers);

    const body = await c.req.json();
    const parsed = changeRoleSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        error("VALIDATION_ERROR", "Invalid role. Must be one of: platform_admin, admin, staff, customer"),
        400,
      );
    }

    const { role: newRole } = parsed.data;

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    const [membership] = await db
      .select()
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.id, membershipId),
          eq(tenantMemberships.user_id, id),
        ),
      )
      .limit(1);

    if (!membership) {
      return c.json(error("NOT_FOUND", "Membership not found"), 404);
    }

    const oldRole = membership.role;

    await db
      .update(tenantMemberships)
      .set({ role: newRole })
      .where(eq(tenantMemberships.id, membershipId));

    await insertAudit(
      actor.id,
      "platform_admin",
      "user.role_changed",
      "user",
      id,
      { email: userRow.email, membershipId, oldRole, newRole },
      ip,
    );

    return c.json(success({ message: "Role updated" }));
  },
);

// POST /users/:id/reset-password — admin reset a user's password
app.post(
  "/:id/reset-password",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");
    const ip = getClientIp(c.req.raw.headers);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow || !userRow.auth_id) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Use admin-provided password or generate a random one
    const body = await c.req.json().catch(() => ({}));
    const newPassword =
      typeof body.newPassword === "string" && body.newPassword.length >= 8
        ? body.newPassword
        : crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const hashedPassword = await hashPassword(newPassword);

    // Update the credential account's password
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(
        and(
          eq(account.userId, userRow.auth_id),
          eq(account.providerId, "credential"),
        ),
      );

    // Force logout — delete all sessions for this user
    await db.delete(session).where(eq(session.userId, userRow.auth_id));

    await insertAudit(
      actor.id,
      "platform_admin",
      "user.password_reset",
      "user",
      id,
      { email: userRow.email },
      ip,
    );

    return c.json(success({ temporaryPassword: newPassword }));
  },
);

export { app as usersRouter };
