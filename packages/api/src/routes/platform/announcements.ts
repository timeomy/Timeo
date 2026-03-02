import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { announcements } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /announcements — list all
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.created_at));
  return c.json(success(rows));
});

// POST /announcements — create
app.post(
  "/",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1),
      type: z.enum(["info", "warning", "critical"]).default("info"),
      target: z.enum(["all", "admins"]).default("all"),
      active: z.boolean().default(true),
      expires_at: z.string().datetime().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const id = generateId();
    await db.insert(announcements).values({
      id,
      title: body.title,
      body: body.body,
      type: body.type,
      target: body.target,
      active: body.active,
      created_by: user.id,
      expires_at: body.expires_at ? new Date(body.expires_at) : null,
    });

    await insertAudit(
      user.id,
      "platform_admin",
      "announcement.created",
      "announcement",
      id,
      { title: body.title },
      ip,
    );

    const [created] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return c.json(success(created), 201);
  },
);

// PATCH /announcements/:id — update
app.patch(
  "/:id",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200).optional(),
      body: z.string().min(1).optional(),
      type: z.enum(["info", "warning", "critical"]).optional(),
      target: z.enum(["all", "admins"]).optional(),
      active: z.boolean().optional(),
      expires_at: z.string().datetime().nullable().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existing) {
      return c.json(error("NOT_FOUND", "Announcement not found"), 404);
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.body !== undefined) updateData.body = body.body;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.target !== undefined) updateData.target = body.target;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.expires_at !== undefined) {
      updateData.expires_at = body.expires_at
        ? new Date(body.expires_at)
        : null;
    }

    await db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, id));

    await insertAudit(
      user.id,
      "platform_admin",
      "announcement.updated",
      "announcement",
      id,
      { changes: body },
      ip,
    );

    const [updated] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return c.json(success(updated));
  },
);

// DELETE /announcements/:id
app.delete("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [existing] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  if (!existing) {
    return c.json(error("NOT_FOUND", "Announcement not found"), 404);
  }

  await db.delete(announcements).where(eq(announcements.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "announcement.deleted",
    "announcement",
    id,
    { title: existing.title },
    ip,
  );

  return c.json(success({ message: "Announcement deleted" }));
});

export { app as announcementsRouter };
