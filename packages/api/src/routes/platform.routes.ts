import { Hono } from "hono";
import { db } from "@timeo/db";
import {
  tenants,
  platformConfig,
  featureFlags,
  auditLogs,
} from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { requirePlatformAdmin } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /platform/tenants - list all tenants (platform admin)
app.get(
  "/tenants",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const rows = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.created_at));
    return c.json(success(rows));
  },
);

// GET /platform/config - get platform config
app.get(
  "/config",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const rows = await db.select().from(platformConfig);
    return c.json(success(rows));
  },
);

// PUT /platform/config/:key
app.put(
  "/config/:key",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const user = c.get("user");
    const key = c.req.param("key");
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(platformConfig)
        .set({ value: body.value, updated_at: new Date() })
        .where(eq(platformConfig.key, key));
    } else {
      await db.insert(platformConfig).values({
        id: generateId(),
        key,
        value: body.value,
      });
    }

    await db.insert(auditLogs).values({
      id: generateId(),
      actor_id: user.id,
      action: "platform.config_updated",
      resource: "platform_config",
      resource_id: key,
    });

    return c.json(success({ message: "Config updated" }));
  },
);

// GET /platform/feature-flags
app.get(
  "/feature-flags",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const rows = await db.select().from(featureFlags);
    return c.json(success(rows));
  },
);

// PUT /platform/feature-flags/:key
app.put(
  "/feature-flags/:key",
  authMiddleware,
  requirePlatformAdmin,
  async (c) => {
    const user = c.get("user");
    const key = c.req.param("key");
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(featureFlags)
        .set({
          enabled: body.enabled,
          tenant_id: body.tenantId ?? null,
          metadata: body.metadata ?? null,
        })
        .where(eq(featureFlags.id, existing.id));
    } else {
      await db.insert(featureFlags).values({
        id: generateId(),
        key,
        enabled: body.enabled ?? false,
        tenant_id: body.tenantId ?? null,
        metadata: body.metadata ?? null,
      });
    }

    await db.insert(auditLogs).values({
      id: generateId(),
      actor_id: user.id,
      action: "platform.feature_flag_updated",
      resource: "feature_flags",
      resource_id: key,
    });

    return c.json(success({ message: "Feature flag updated" }));
  },
);

export { app as platformRouter };
