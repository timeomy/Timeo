import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";

// ─── Platform Config ─────────────────────────────────────────────────────────
export const platformConfig = pgTable(
  "platform_config",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("platform_config_key_idx").on(t.key)],
);

// ─── Feature Flags ───────────────────────────────────────────────────────────
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    tenant_id: text("tenant_id").references(() => tenants.id),
    enabled: boolean("enabled").notNull().default(false),
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("feature_flags_key_idx").on(t.key),
    index("feature_flags_tenant_id_idx").on(t.tenant_id),
  ],
);

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id").references(() => tenants.id),
    actor_id: text("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resource_id: text("resource_id").notNull(),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_tenant_id_idx").on(t.tenant_id),
    index("audit_logs_actor_id_idx").on(t.actor_id),
  ],
);
