-- Migration: WS Fitness full import support
-- Idempotent schema additions for external IDs, media fields, and legacy turnstile tables.

DO $$ BEGIN
  ALTER TYPE "check_in_method" ADD VALUE IF NOT EXISTS 'face';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "nfc_card_id" text,
  ADD COLUMN IF NOT EXISTS "birthday" date,
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "hourly_rate" integer,
  ADD COLUMN IF NOT EXISTS "face_image_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_nfc_card_id_key" ON "users"("nfc_card_id");

ALTER TABLE "tenant_memberships"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "waiver_signature" text,
  ADD COLUMN IF NOT EXISTS "waiver_signed_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "tenant_memberships_external_id_idx"
  ON "tenant_memberships"("external_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_memberships_tenant_external_idx"
  ON "tenant_memberships"("tenant_id", "external_id");

ALTER TABLE "memberships"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "duration_days" integer,
  ADD COLUMN IF NOT EXISTS "access_level" text,
  ADD COLUMN IF NOT EXISTS "display_order" integer;

CREATE INDEX IF NOT EXISTS "memberships_tenant_external_id_idx"
  ON "memberships"("tenant_id", "external_id");

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "price_paid" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_external_id_idx"
  ON "subscriptions"("tenant_id", "external_id");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "method" text,
  ADD COLUMN IF NOT EXISTS "receipt_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_tenant_external_id_idx"
  ON "payments"("tenant_id", "external_id");

ALTER TABLE "payment_requests"
  ADD COLUMN IF NOT EXISTS "external_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_requests_tenant_external_id_idx"
  ON "payment_requests"("tenant_id", "external_id");

ALTER TABLE "check_ins"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "gate" text,
  ADD COLUMN IF NOT EXISTS "device" text,
  ADD COLUMN IF NOT EXISTS "entry_type" text,
  ADD COLUMN IF NOT EXISTS "notes" text;

CREATE UNIQUE INDEX IF NOT EXISTS "check_ins_tenant_external_id_idx"
  ON "check_ins"("tenant_id", "external_id");

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users"("id"),
  "invoice_number" text NOT NULL,
  "amount" integer NOT NULL DEFAULT 0,
  "tax_amount" integer,
  "currency" text DEFAULT 'MYR',
  "status" text DEFAULT 'draft',
  "items" jsonb DEFAULT '[]'::jsonb,
  "myinvois_id" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "transaction_id" text,
  "payment_method" text,
  "source" text
);

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "external_id" text,
  ADD COLUMN IF NOT EXISTS "subtotal" integer,
  ADD COLUMN IF NOT EXISTS "tax_rate" integer,
  ADD COLUMN IF NOT EXISTS "total_amount" integer,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "issue_date" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoices_user_id_idx" ON "invoices"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_external_id_idx"
  ON "invoices"("tenant_id", "external_id");

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "invoice_id" text NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "external_id" text,
  "description" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price" integer NOT NULL DEFAULT 0,
  "tax_rate" integer,
  "tax_amount" integer,
  "total" integer,
  "classification_code" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "invoice_items_tenant_id_idx" ON "invoice_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_items_tenant_external_id_idx"
  ON "invoice_items"("tenant_id", "external_id");

CREATE TABLE IF NOT EXISTS "turnstile_events" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "external_id" text,
  "received_at" timestamp with time zone,
  "device_sn" text,
  "cmd" text,
  "sequence_no" integer,
  "cap_time" text,
  "match_result" text,
  "match_failed_reason" text,
  "person_id" text,
  "person_name" text,
  "customer_text" text,
  "raw_payload" jsonb,
  "is_rejected" boolean NOT NULL DEFAULT false,
  "reject_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "turnstile_events_tenant_id_idx"
  ON "turnstile_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "turnstile_events_device_sn_idx"
  ON "turnstile_events"("device_sn");
CREATE INDEX IF NOT EXISTS "turnstile_events_tenant_date_idx"
  ON "turnstile_events"("tenant_id", "received_at");

CREATE UNIQUE INDEX IF NOT EXISTS "turnstile_events_tenant_external_id_idx"
  ON "turnstile_events"("tenant_id", "external_id");

CREATE TABLE IF NOT EXISTS "turnstile_face_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "external_id" text,
  "device_sn" text,
  "user_id" text REFERENCES "users"("id"),
  "person_id" text,
  "cap_time" text,
  "decision" text,
  "reason" text,
  "raw_payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "turnstile_face_logs_tenant_id_idx"
  ON "turnstile_face_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "turnstile_face_logs_device_sn_idx"
  ON "turnstile_face_logs"("device_sn");
CREATE INDEX IF NOT EXISTS "turnstile_face_logs_user_id_idx"
  ON "turnstile_face_logs"("user_id");
CREATE INDEX IF NOT EXISTS "turnstile_face_logs_tenant_date_idx"
  ON "turnstile_face_logs"("tenant_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "turnstile_face_logs_tenant_external_id_idx"
  ON "turnstile_face_logs"("tenant_id", "external_id");

