import { Hono } from "hono";
import { db } from "@timeo/db";
import { users, tenantMemberships, session } from "@timeo/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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

export { app as usersRouter };
