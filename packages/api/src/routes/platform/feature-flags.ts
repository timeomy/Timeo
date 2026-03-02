import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { featureFlags, featureFlagOverrides } from "@timeo/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /feature-flags — list all global flags + per-tenant overrides
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const flags = await db.select().from(featureFlags);
  const overrides = await db.select().from(featureFlagOverrides);

  // Group overrides by flag ID
  const overridesByFlag = new Map<
    string,
    Array<{ tenant_id: string; enabled: boolean }>
  >();
  for (const o of overrides) {
    const list = overridesByFlag.get(o.feature_flag_id) ?? [];
    list.push({ tenant_id: o.tenant_id, enabled: o.enabled });
    overridesByFlag.set(o.feature_flag_id, list);
  }

  const result = flags.map((flag) => ({
    ...flag,
    overrides: overridesByFlag.get(flag.id) ?? [],
  }));

  return c.json(success(result));
});

// POST /feature-flags — create flag
app.post(
  "/",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      default_enabled: z.boolean().default(false),
      phase: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select({ id: featureFlags.id })
      .from(featureFlags)
      .where(eq(featureFlags.key, body.key))
      .limit(1);

    if (existing) {
      return c.json(error("KEY_EXISTS", "Feature flag key already exists"), 409);
    }

    const id = generateId();
    await db.insert(featureFlags).values({ id, ...body });

    await insertAudit(
      user.id,
      "platform_admin",
      "feature_flag.created",
      "feature_flag",
      id,
      { key: body.key, name: body.name },
      ip,
    );

    const [created] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id));
    return c.json(success(created), 201);
  },
);

// PUT /feature-flags/:id — update flag
app.put(
  "/:id",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      default_enabled: z.boolean().optional(),
      phase: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .limit(1);

    if (!existing) {
      return c.json(error("NOT_FOUND", "Feature flag not found"), 404);
    }

    await db.update(featureFlags).set(body).where(eq(featureFlags.id, id));

    await insertAudit(
      user.id,
      "platform_admin",
      "feature_flag.updated",
      "feature_flag",
      id,
      { key: existing.key, changes: body },
      ip,
    );

    const [updated] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id));
    return c.json(success(updated));
  },
);

// PUT /feature-flags/:id/override — toggle per-tenant override
app.put(
  "/:id/override",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      tenantId: z.string().min(1),
      enabled: z.boolean(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const flagId = c.req.param("id");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);

    if (!flag) {
      return c.json(error("NOT_FOUND", "Feature flag not found"), 404);
    }

    // Upsert override
    const [existing] = await db
      .select()
      .from(featureFlagOverrides)
      .where(
        and(
          eq(featureFlagOverrides.feature_flag_id, flagId),
          eq(featureFlagOverrides.tenant_id, body.tenantId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(featureFlagOverrides)
        .set({ enabled: body.enabled })
        .where(eq(featureFlagOverrides.id, existing.id));
    } else {
      await db.insert(featureFlagOverrides).values({
        id: generateId(),
        feature_flag_id: flagId,
        tenant_id: body.tenantId,
        enabled: body.enabled,
      });
    }

    await insertAudit(
      user.id,
      "platform_admin",
      "feature_flag.override_set",
      "feature_flag_override",
      flagId,
      { key: flag.key, tenantId: body.tenantId, enabled: body.enabled },
      ip,
      body.tenantId,
    );

    return c.json(success({ message: "Override set" }));
  },
);

// DELETE /feature-flags/:id/override/:tenantId — remove per-tenant override
app.delete(
  "/:id/override/:tenantId",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const user = c.get("user");
    const flagId = c.req.param("id");
    const tenantId = c.req.param("tenantId");
    const ip = getClientIp(c.req.raw.headers);

    const deleted = await db
      .delete(featureFlagOverrides)
      .where(
        and(
          eq(featureFlagOverrides.feature_flag_id, flagId),
          eq(featureFlagOverrides.tenant_id, tenantId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return c.json(error("NOT_FOUND", "Override not found"), 404);
    }

    await insertAudit(
      user.id,
      "platform_admin",
      "feature_flag.override_removed",
      "feature_flag_override",
      flagId,
      { tenantId },
      ip,
      tenantId,
    );

    return c.json(success({ message: "Override removed" }));
  },
);

export { app as featureFlagsRouter };
