import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { tenants, tenantMemberships, users } from "@timeo/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { redis } from "../../lib/redis.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /tenants — list all tenants with member count
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      status: tenants.status,
      settings: tenants.settings,
      branding: tenants.branding,
      created_at: tenants.created_at,
      updated_at: tenants.updated_at,
      member_count: sql<number>`(
        SELECT COUNT(*) FROM tenant_memberships
        WHERE tenant_memberships.tenant_id = ${tenants.id}
        AND tenant_memberships.status = 'active'
      )`.as("member_count"),
    })
    .from(tenants)
    .orderBy(desc(tenants.created_at));

  return c.json(success(rows));
});

// POST /tenants — onboard a new tenant
app.post(
  "/",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
      ownerEmail: z.string().email(),
      plan: z.enum(["free", "starter", "pro", "enterprise"]).default("free"),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    // Check slug uniqueness
    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1);

    if (existing) {
      return c.json(error("SLUG_TAKEN", "Tenant slug already in use"), 409);
    }

    // Find or validate owner user
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.ownerEmail))
      .limit(1);

    if (!owner) {
      return c.json(error("OWNER_NOT_FOUND", "No user with that email"), 404);
    }

    const tenantId = generateId();
    await db.insert(tenants).values({
      id: tenantId,
      name: body.name,
      slug: body.slug,
      owner_id: owner.id,
      plan: body.plan,
      status: "active",
    });

    // Add owner as admin member
    await db.insert(tenantMemberships).values({
      id: generateId(),
      user_id: owner.id,
      tenant_id: tenantId,
      role: "admin",
      status: "active",
    });

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant.created",
      "tenant",
      tenantId,
      { name: body.name, slug: body.slug, plan: body.plan },
      ip,
    );

    const [created] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    return c.json(success(created), 201);
  },
);

// GET /tenants/:id — tenant detail
app.get("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const id = c.req.param("id");

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(tenantMemberships)
    .where(eq(tenantMemberships.tenant_id, id));

  return c.json(
    success({ ...tenant, member_count: memberCount?.count ?? 0 }),
  );
});

// PATCH /tenants/:id/suspend
app.patch("/:id/suspend", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  }

  await db
    .update(tenants)
    .set({ status: "suspended", updated_at: new Date() })
    .where(eq(tenants.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "tenant.suspended",
    "tenant",
    id,
    { name: tenant.name },
    ip,
  );

  return c.json(success({ message: "Tenant suspended" }));
});

// PATCH /tenants/:id/activate
app.patch("/:id/activate", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  }

  await db
    .update(tenants)
    .set({ status: "active", updated_at: new Date() })
    .where(eq(tenants.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "tenant.activated",
    "tenant",
    id,
    { name: tenant.name },
    ip,
  );

  return c.json(success({ message: "Tenant activated" }));
});

// DELETE /tenants/:id — hard delete
app.delete("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  }

  // Delete memberships first (FK constraint)
  await db
    .delete(tenantMemberships)
    .where(eq(tenantMemberships.tenant_id, id));
  await db.delete(tenants).where(eq(tenants.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "tenant.deleted",
    "tenant",
    id,
    { name: tenant.name, slug: tenant.slug },
    ip,
  );

  return c.json(success({ message: "Tenant deleted" }));
});

// GET /tenants/:id/members — list tenant members
app.get("/:id/members", authMiddleware, requirePlatformAdmin, async (c) => {
  const id = c.req.param("id");

  const members = await db
    .select({
      id: tenantMemberships.id,
      user_id: tenantMemberships.user_id,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      joined_at: tenantMemberships.joined_at,
      user_name: users.name,
      user_email: users.email,
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(tenantMemberships.user_id, users.id))
    .where(eq(tenantMemberships.tenant_id, id));

  return c.json(success(members));
});

// POST /tenants/:id/impersonate — create 30-min impersonation token
app.post(
  "/:id/impersonate",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const ip = getClientIp(c.req.raw.headers);

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      return c.json(error("NOT_FOUND", "Tenant not found"), 404);
    }

    const token = generateId();
    await redis.set(
      `impersonate:${user.id}:${id}`,
      JSON.stringify({
        actorId: user.id,
        tenantId: id,
        tenantName: tenant.name,
        createdAt: new Date().toISOString(),
      }),
      "EX",
      1800, // 30 minutes
    );

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant.impersonated",
      "tenant",
      id,
      { tenantName: tenant.name },
      ip,
    );

    return c.json(success({ token, expiresIn: 1800, tenantId: id }));
  },
);

export { app as tenantsRouter };
