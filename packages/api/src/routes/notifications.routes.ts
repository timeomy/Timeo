import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { notifications } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { success } from "../lib/response.js";
import { MarkNotificationsReadSchema } from "../lib/validation.js";
import * as NotificationService from "../services/notification.service.js";

const app = new Hono();

// GET /tenants/:tenantId/notifications
app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, user.id),
        eq(notifications.tenant_id, tenantId),
      ),
    )
    .orderBy(desc(notifications.created_at));
  return c.json(success(rows));
});

// PATCH /tenants/:tenantId/notifications/read
app.patch(
  "/read",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", MarkNotificationsReadSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    await NotificationService.markNotificationsRead(user.id, body.ids);
    return c.json(success({ message: "Marked as read" }));
  },
);

// PATCH /tenants/:tenantId/notifications/read-all
app.patch(
  "/read-all",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    await NotificationService.markAllNotificationsRead(user.id, tenantId);
    return c.json(success({ message: "All marked as read" }));
  },
);

export { app as notificationsRouter };
