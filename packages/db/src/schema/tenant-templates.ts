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
import { tenantTemplateStatusEnum } from "./enums";

export const tenantTemplates = pgTable(
  "tenant_templates",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    industry: text("industry").notNull(),
    name: text("name").notNull(),
    status: tenantTemplateStatusEnum("status").notNull().default("draft"),
    current_version: integer("current_version").notNull().default(1),
    created_by: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_templates_key_unique").on(table.key),
    index("tenant_templates_industry_idx").on(table.industry),
  ],
);

export const tenantTemplateVersions = pgTable(
  "tenant_template_versions",
  {
    id: text("id").primaryKey(),
    template_id: text("template_id")
      .notNull()
      .references(() => tenantTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    schema_version: integer("schema_version").notNull().default(1),
    definition: jsonb("definition").notNull(),
    is_published: boolean("is_published").notNull().default(false),
    published_by: text("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_template_versions_template_version_unique").on(
      table.template_id,
      table.version,
    ),
    index("tenant_template_versions_template_id_idx").on(table.template_id),
  ],
);

export const tenantTemplateAssignments = pgTable(
  "tenant_template_assignments",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    template_id: text("template_id")
      .notNull()
      .references(() => tenantTemplates.id, { onDelete: "restrict" }),
    template_version_id: text("template_version_id")
      .notNull()
      .references(() => tenantTemplateVersions.id, { onDelete: "restrict" }),
    industry_snapshot: text("industry_snapshot"),
    source: text("source").notNull().default("system"),
    is_pinned: boolean("is_pinned").notNull().default(false),
    applied_by: text("applied_by").references(() => users.id, {
      onDelete: "set null",
    }),
    applied_at: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_template_assignments_tenant_id_unique").on(
      table.tenant_id,
    ),
    index("tenant_template_assignments_tenant_id_idx").on(table.tenant_id),
    index("tenant_template_assignments_template_id_idx").on(table.template_id),
    index("tenant_template_assignments_industry_snapshot_idx").on(
      table.industry_snapshot,
    ),
  ],
);

export const tenantUiOverrides = pgTable(
  "tenant_ui_overrides",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    member_portal_override: jsonb("member_portal_override").notNull().default({}),
    admin_panel_override: jsonb("admin_panel_override").notNull().default({}),
    updated_by: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revision: integer("revision").notNull().default(0),
  },
  (table) => [
    uniqueIndex("tenant_ui_overrides_tenant_id_unique").on(table.tenant_id),
    index("tenant_ui_overrides_tenant_id_idx").on(table.tenant_id),
  ],
);
