import { Hono } from "hono";
import { db } from "@timeo/db";
import { sql } from "drizzle-orm";
import { success } from "../lib/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { generateId } from "@timeo/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// ─── /api/feed router (public explore) ───────────────────────────────────────
const feedApp = new Hono();

feedApp.get("/broadcasts", async (c) => {
  const rows = await db.execute(sql`
    SELECT b.id, b.title, b.content, b.image_url, b.link_url, b.type,
           b.is_active, b.starts_at, b.expires_at, b.created_at,
           b.tenant_id,
           t.name as tenant_name,
           t.branding->>'logoUrl' as tenant_logo
    FROM broadcasts b
    JOIN tenants t ON b.tenant_id = t.id
    WHERE b.is_active = true
      AND (b.expires_at IS NULL OR b.expires_at > NOW())
      AND t.is_public = true
    ORDER BY b.created_at DESC
    LIMIT 50
  `);
  return c.json(success(rows));
});

feedApp.get("/discover", async (c) => {
  const [broadcasts, businesses] = await Promise.all([
    db.execute(sql`
      SELECT b.id, b.title, b.content, b.image_url, b.link_url, b.type,
             b.tenant_id,
             t.name as tenant_name,
             t.branding->>'logoUrl' as tenant_logo
      FROM broadcasts b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.is_active = true
        AND (b.expires_at IS NULL OR b.expires_at > NOW())
        AND t.is_public = true
      ORDER BY b.created_at DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT id, name, slug,
             branding->>'logoUrl' as logo_url,
             branding->>'coverUrl' as cover_url
      FROM tenants
      WHERE is_public = true AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 20
    `),
  ]);
  return c.json(success({ broadcasts, businesses }));
});

// ─── /api/tenants/:tenantId/broadcasts router ─────────────────────────────────
const broadcastsApp = new Hono();

broadcastsApp.get("/", async (c) => {
  const tenantId = c.req.param("tenantId");
  const rows = await db.execute(sql`
    SELECT b.id, b.title, b.content, b.image_url, b.link_url, b.type,
           b.is_active, b.starts_at, b.expires_at, b.created_at, b.updated_at,
           b.tenant_id,
           t.name as tenant_name,
           t.branding->>'logoUrl' as tenant_logo
    FROM broadcasts b
    JOIN tenants t ON b.tenant_id = t.id
    WHERE b.tenant_id = ${tenantId}
      AND b.is_active = true
      AND (b.expires_at IS NULL OR b.expires_at > NOW())
    ORDER BY b.created_at DESC
  `);
  return c.json(success(rows));
});

// Admin: get all (including inactive)
broadcastsApp.get("/admin", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.req.param("tenantId");
  const rows = await db.execute(sql`
    SELECT id, title, content, image_url, link_url, type, is_active, starts_at, expires_at, created_at, updated_at
    FROM broadcasts
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `);
  return c.json(success(rows));
});

const CreateBroadcastSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  linkUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  type: z.enum(["promotion", "announcement", "event", "new_service"]).default("promotion"),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

broadcastsApp.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateBroadcastSchema),
  async (c) => {
    const tenantId = c.req.param("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.execute(sql`
      INSERT INTO broadcasts (id, tenant_id, title, content, image_url, link_url, type, is_active, expires_at)
      VALUES (
        ${id}, ${tenantId}, ${body.title ?? null}, ${body.content ?? null},
        ${body.imageUrl || null}, ${body.linkUrl || null},
        ${body.type}, ${body.isActive},
        ${body.expiresAt ? new Date(body.expiresAt) : null}
      )
    `);

    return c.json(success({ id }), 201);
  }
);

broadcastsApp.patch(
  "/:broadcastId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const broadcastId = c.req.param("broadcastId");
    const tenantId = c.req.param("tenantId");
    const body = await c.req.json() as Record<string, unknown>;

    await db.execute(sql`
      UPDATE broadcasts SET
        is_active = COALESCE(${typeof body.isActive === "boolean" ? body.isActive : null}::boolean, is_active),
        updated_at = NOW()
      WHERE id = ${broadcastId} AND tenant_id = ${tenantId}
    `);

    return c.json(success({ message: "Updated" }));
  }
);

broadcastsApp.delete(
  "/:broadcastId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const broadcastId = c.req.param("broadcastId");
    const tenantId = c.req.param("tenantId");
    await db.execute(sql`
      DELETE FROM broadcasts WHERE id = ${broadcastId} AND tenant_id = ${tenantId}
    `);
    return c.json(success({ message: "Deleted" }));
  }
);

// ─── /api/tenants/:tenantId/catalog router ────────────────────────────────────
const catalogApp = new Hono();

catalogApp.get("/", async (c) => {
  const tenantId = c.req.param("tenantId");
  const rows = await db.execute(sql`
    SELECT id, tenant_id, name, description, price, duration_minutes,
           category, image_url, is_active, created_at
    FROM service_catalog
    WHERE tenant_id = ${tenantId} AND is_active = true
    ORDER BY category, name
  `);
  return c.json(success(rows));
});

export { feedApp as feedRouter, broadcastsApp as broadcastsRouter, catalogApp as catalogRouter };
