import { Hono } from "hono";
import { db, generateId } from "@timeo/db";
import { featureFlags } from "@timeo/db/schema";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const DEFAULT_FLAGS = [
  { key: "pos_enabled", name: "POS System", phase: "2", default_enabled: true },
  {
    key: "appointments_enabled",
    name: "Appointments",
    phase: "3",
    default_enabled: true,
  },
  {
    key: "loyalty_enabled",
    name: "Loyalty Program",
    phase: "4",
    default_enabled: false,
  },
  {
    key: "offline_sync",
    name: "Offline POS Sync",
    phase: "2",
    default_enabled: false,
  },
  {
    key: "custom_domain",
    name: "Custom Domain",
    phase: "5",
    default_enabled: false,
  },
  {
    key: "e_invoice",
    name: "e-Invoice (LHDN)",
    phase: "3",
    default_enabled: false,
  },
  {
    key: "inventory_enabled",
    name: "Inventory Management",
    phase: "4",
    default_enabled: false,
  },
  {
    key: "analytics_advanced",
    name: "Advanced Analytics",
    phase: "5",
    default_enabled: false,
  },
  {
    key: "multi_currency",
    name: "Multi-Currency",
    phase: "5",
    default_enabled: false,
  },
  {
    key: "maintenance_mode",
    name: "Maintenance Mode",
    phase: "1",
    default_enabled: false,
  },
];

const app = new Hono();

// POST /data/seed-flags — seed default feature flags if table is empty
app.post("/seed-flags", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const ip = getClientIp(c.req.raw.headers);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(featureFlags);

  if (count > 0) {
    return c.json(
      success({
        message: "Feature flags table is not empty, skipping seed",
        existing_count: count,
      }),
    );
  }

  const values = DEFAULT_FLAGS.map((flag) => ({
    id: generateId(),
    ...flag,
  }));

  await db.insert(featureFlags).values(values);

  await insertAudit(
    user.id,
    "platform_admin",
    "data.flags_seeded",
    "feature_flag",
    undefined,
    { count: values.length },
    ip,
  );

  return c.json(
    success({
      message: `Seeded ${values.length} default feature flags`,
      count: values.length,
    }),
    201,
  );
});

export { app as dataRouter };
