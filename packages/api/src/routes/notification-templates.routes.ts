import { Hono } from "hono";
import { db } from "@timeo/db";
import { sql } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success } from "../lib/response.js";

const app = new Hono();

// GET /tenants/:tenantId/notification-templates
app.get("/", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db.execute(sql`
    SELECT * FROM notification_templates WHERE tenant_id = ${tenantId} ORDER BY type
  `);
  return c.json(success(rows));
});

// PUT /tenants/:tenantId/notification-templates/:id  
app.put("/:id", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = await c.req.json();

  await db.execute(sql`
    UPDATE notification_templates
    SET template = COALESCE(${body.template}, template),
        is_active = COALESCE(${body.isActive ?? null}, is_active)
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `);
  return c.json(success({ message: "Updated" }));
});

// GET /tenants/:tenantId/notification-settings
const settingsApp = new Hono();

settingsApp.get("/", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const [row] = await db.execute(sql`
    SELECT settings FROM tenants WHERE id = ${tenantId} LIMIT 1
  `);
  const settings = (row as { settings: Record<string, unknown> })?.settings ?? {};
  return c.json(success(settings.whatsapp ?? {}));
});

settingsApp.patch("/", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();

  await db.execute(sql`
    UPDATE tenants
    SET settings = settings || jsonb_build_object('whatsapp', ${JSON.stringify(body)}::jsonb)
    WHERE id = ${tenantId}
  `);
  return c.json(success({ message: "Updated" }));
});

export { app as notificationTemplatesRouter, settingsApp as notificationSettingsRouter };
