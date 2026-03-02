-- C2 Platform Control Center — schema migration
-- Adds/updates all 8 platform tables per specs/phase-1/c2-platform-control-center.md

--> statement-breakpoint

-- ─── platform_config: add section + updated_by, fix unique constraint ─────────
ALTER TABLE "platform_config" ADD COLUMN "section" text;
UPDATE "platform_config" SET "section" = 'general' WHERE "section" IS NULL;
ALTER TABLE "platform_config" ALTER COLUMN "section" SET NOT NULL;
ALTER TABLE "platform_config" ADD COLUMN "updated_by" text REFERENCES "users"("id");
ALTER TABLE "platform_config" DROP CONSTRAINT IF EXISTS "platform_config_key_unique";
DROP INDEX IF EXISTS "platform_config_key_idx";
CREATE UNIQUE INDEX "platform_config_section_key_idx" ON "platform_config" ("section", "key");
CREATE INDEX "platform_config_section_idx" ON "platform_config" ("section");

--> statement-breakpoint

-- ─── feature_flags: drop old (had tenant_id/enabled/metadata), recreate ────────
DROP INDEX IF EXISTS "feature_flags_key_idx";
DROP INDEX IF EXISTS "feature_flags_tenant_id_idx";
DROP TABLE "feature_flags";

CREATE TABLE "feature_flags" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "default_enabled" boolean NOT NULL DEFAULT false,
  "phase" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feature_flags_key_unique" UNIQUE ("key")
);
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" ("key");

--> statement-breakpoint

-- ─── feature_flag_overrides: new table ────────────────────────────────────────
CREATE TABLE "feature_flag_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "feature_flag_id" text NOT NULL REFERENCES "feature_flags"("id") ON DELETE CASCADE,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "enabled" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "feature_flag_overrides_flag_tenant_idx" ON "feature_flag_overrides" ("feature_flag_id", "tenant_id");
CREATE INDEX "feature_flag_overrides_tenant_idx" ON "feature_flag_overrides" ("tenant_id");

--> statement-breakpoint

-- ─── audit_logs: rename columns, add new columns ──────────────────────────────
ALTER TABLE "audit_logs" RENAME COLUMN "resource" TO "resource_type";
ALTER TABLE "audit_logs" RENAME COLUMN "metadata" TO "details";
ALTER TABLE "audit_logs" RENAME COLUMN "timestamp" TO "created_at";
ALTER TABLE "audit_logs" ADD COLUMN "actor_role" text NOT NULL DEFAULT 'admin';
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;
DROP INDEX IF EXISTS "audit_logs_tenant_id_idx";
DROP INDEX IF EXISTS "audit_logs_actor_id_idx";
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" ("actor_id");
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" ("tenant_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");

--> statement-breakpoint

-- ─── plans: new table ──────────────────────────────────────────────────────────
CREATE TABLE "plans" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "price_cents" integer NOT NULL,
  "interval" text NOT NULL DEFAULT 'monthly',
  "features" jsonb NOT NULL DEFAULT '[]',
  "limits" jsonb NOT NULL DEFAULT '{}',
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plans_slug_unique" UNIQUE ("slug")
);
CREATE INDEX "plans_slug_idx" ON "plans" ("slug");
CREATE INDEX "plans_active_idx" ON "plans" ("active");

--> statement-breakpoint

-- ─── announcements: new table ─────────────────────────────────────────────────
CREATE TABLE "announcements" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "type" text NOT NULL DEFAULT 'info',
  "target" text NOT NULL DEFAULT 'all',
  "active" boolean NOT NULL DEFAULT true,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone
);
CREATE INDEX "announcements_active_idx" ON "announcements" ("active");
CREATE INDEX "announcements_created_at_idx" ON "announcements" ("created_at");

--> statement-breakpoint

-- ─── email_templates: new table ───────────────────────────────────────────────
CREATE TABLE "email_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "body_text" text,
  "variables" jsonb NOT NULL DEFAULT '[]',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_templates_key_unique" UNIQUE ("key")
);
CREATE INDEX "email_templates_key_idx" ON "email_templates" ("key");

--> statement-breakpoint

-- ─── api_keys: new table ──────────────────────────────────────────────────────
CREATE TABLE "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "permissions" jsonb NOT NULL DEFAULT '[]',
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys" ("tenant_id");
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
