import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";

// ─── Platform Config ──────────────────────────────────────────────────────────
// Runtime configuration stored in DB — replaces .env for non-secret settings.
// Only infrastructure secrets (DATABASE_URL, REDIS_URL, RM keys) stay in .env.
export const platformConfig = pgTable(
  "platform_config",
  {
    id: text("id").primaryKey(),
    section: text("section").notNull(), // e.g. "email", "payment", "auth", "general"
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_by: text("updated_by").references(() => users.id),
  },
  (t) => [
    uniqueIndex("platform_config_section_key_idx").on(t.section, t.key),
    index("platform_config_section_idx").on(t.section),
  ],
);

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    price_cents: integer("price_cents").notNull(), // RM50.00 = 5000
    interval: text("interval").notNull().default("monthly"), // "monthly" | "yearly"
    features: jsonb("features").notNull().default([]),
    limits: jsonb("limits").notNull().default({}),
    active: boolean("active").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("plans_slug_idx").on(t.slug),
    index("plans_active_idx").on(t.active),
  ],
);

// ─── Feature Flags (global definitions) ──────────────────────────────────────
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(), // e.g. "pos_enabled", "appointments_enabled"
    name: text("name").notNull(),
    description: text("description"),
    default_enabled: boolean("default_enabled").notNull().default(false),
    phase: text("phase"), // "1", "2", "3", "4", "5"
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("feature_flags_key_idx").on(t.key)],
);

// ─── Feature Flag Overrides (per-tenant) ─────────────────────────────────────
export const featureFlagOverrides = pgTable(
  "feature_flag_overrides",
  {
    id: text("id").primaryKey(),
    feature_flag_id: text("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("feature_flag_overrides_flag_tenant_idx").on(
      t.feature_flag_id,
      t.tenant_id,
    ),
    index("feature_flag_overrides_tenant_idx").on(t.tenant_id),
  ],
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actor_id: text("actor_id")
      .notNull()
      .references(() => users.id),
    actor_role: text("actor_role").notNull(), // "platform_admin" | "admin" | "staff"
    tenant_id: text("tenant_id").references(() => tenants.id),
    action: text("action").notNull(), // e.g. "tenant.suspended", "feature_flag.toggled"
    resource_type: text("resource_type").notNull(), // e.g. "tenant", "user", "feature_flag"
    resource_id: text("resource_id"),
    details: jsonb("details"),
    ip_address: text("ip_address"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_id_idx").on(t.actor_id),
    index("audit_logs_tenant_id_idx").on(t.tenant_id),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_at_idx").on(t.created_at),
  ],
);

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: text("type").notNull().default("info"), // "info" | "warning" | "critical"
    target: text("target").notNull().default("all"), // "all" | "admins"
    active: boolean("active").notNull().default(true),
    created_by: text("created_by")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("announcements_active_idx").on(t.active),
    index("announcements_created_at_idx").on(t.created_at),
  ],
);

// ─── Email Templates ──────────────────────────────────────────────────────────
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(), // "verification" | "reset" | "booking_confirm" | "payment_receipt" | "welcome"
    subject: text("subject").notNull(),
    body_html: text("body_html").notNull(),
    body_text: text("body_text"),
    variables: jsonb("variables").notNull().default([]), // [{name, description}]
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("email_templates_key_idx").on(t.key)],
);

// ─── API Keys ─────────────────────────────────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id").references(() => tenants.id), // null = platform-level key
    name: text("name").notNull(),
    key_hash: text("key_hash").notNull(), // bcrypt hash — never store plaintext
    permissions: jsonb("permissions").notNull().default([]),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("api_keys_tenant_id_idx").on(t.tenant_id),
    index("api_keys_key_hash_idx").on(t.key_hash),
  ],
);
