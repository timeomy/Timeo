-- Migration: Tenant templates (structure-only) metadata tables

DO $$ BEGIN
  CREATE TYPE "tenant_template_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tenant_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "industry" text NOT NULL,
  "name" text NOT NULL,
  "status" "tenant_template_status" NOT NULL DEFAULT 'draft',
  "current_version" integer NOT NULL DEFAULT 1,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_templates_key_unique" UNIQUE("key")
);

CREATE TABLE IF NOT EXISTS "tenant_template_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "template_id" text NOT NULL REFERENCES "tenant_templates"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "schema_version" integer NOT NULL DEFAULT 1,
  "definition" jsonb NOT NULL,
  "is_published" boolean NOT NULL DEFAULT false,
  "published_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_template_versions_template_version_unique" UNIQUE("template_id", "version")
);

CREATE TABLE IF NOT EXISTS "tenant_template_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "template_id" text NOT NULL REFERENCES "tenant_templates"("id") ON DELETE RESTRICT,
  "template_version_id" text NOT NULL REFERENCES "tenant_template_versions"("id") ON DELETE RESTRICT,
  "industry_snapshot" text,
  "source" text NOT NULL DEFAULT 'system',
  "is_pinned" boolean NOT NULL DEFAULT false,
  "applied_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "applied_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_template_assignments_tenant_id_unique" UNIQUE("tenant_id")
);

CREATE TABLE IF NOT EXISTS "tenant_ui_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "member_portal_override" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "admin_panel_override" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "revision" integer NOT NULL DEFAULT 0,
  CONSTRAINT "tenant_ui_overrides_tenant_id_unique" UNIQUE("tenant_id")
);

CREATE INDEX IF NOT EXISTS "tenant_templates_industry_idx"
  ON "tenant_templates"("industry");

CREATE INDEX IF NOT EXISTS "tenant_template_versions_template_id_idx"
  ON "tenant_template_versions"("template_id");

CREATE INDEX IF NOT EXISTS "tenant_template_assignments_tenant_id_idx"
  ON "tenant_template_assignments"("tenant_id");

CREATE INDEX IF NOT EXISTS "tenant_template_assignments_template_id_idx"
  ON "tenant_template_assignments"("template_id");

CREATE INDEX IF NOT EXISTS "tenant_template_assignments_industry_snapshot_idx"
  ON "tenant_template_assignments"("industry_snapshot");

CREATE INDEX IF NOT EXISTS "tenant_ui_overrides_tenant_id_idx"
  ON "tenant_ui_overrides"("tenant_id");
