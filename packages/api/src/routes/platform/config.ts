import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { platformConfig } from "@timeo/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /config — all config grouped by section
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db.select().from(platformConfig);

  // Group by section
  const grouped: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    const section = row.section;
    if (!grouped[section]) grouped[section] = {};
    grouped[section][row.key] = row.value;
  }

  return c.json(success(grouped));
});

// GET /config/:section — section config
app.get("/:section", authMiddleware, requirePlatformAdmin, async (c) => {
  const section = c.req.param("section");

  const rows = await db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.section, section));

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }

  return c.json(success(result));
});

// PUT /config/:section/:key — upsert config value
app.put(
  "/:section/:key",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      value: z.unknown(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const section = c.req.param("section");
    const key = c.req.param("key");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select()
      .from(platformConfig)
      .where(
        and(
          eq(platformConfig.section, section),
          eq(platformConfig.key, key),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(platformConfig)
        .set({
          value: body.value,
          updated_at: new Date(),
          updated_by: user.id,
        })
        .where(eq(platformConfig.id, existing.id));
    } else {
      await db.insert(platformConfig).values({
        id: generateId(),
        section,
        key,
        value: body.value,
        updated_by: user.id,
      });
    }

    await insertAudit(
      user.id,
      "platform_admin",
      "config.updated",
      "platform_config",
      `${section}.${key}`,
      { section, key, value: body.value },
      ip,
    );

    return c.json(success({ message: "Config updated" }));
  },
);

export { app as configRouter };
