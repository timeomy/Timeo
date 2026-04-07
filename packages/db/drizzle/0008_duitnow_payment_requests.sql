-- Migration: DuitNow Payment Requests + Membership Enhancements
-- Adds payment_requests table and extends memberships with duration_months + plan_type

-- 1. New enums
DO $$ BEGIN
  CREATE TYPE "payment_request_status" AS ENUM('pending_verification', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_request_plan_type" AS ENUM('membership', 'session_package');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Extend memberships table
ALTER TABLE "memberships"
  ADD COLUMN IF NOT EXISTS "duration_months" integer,
  ADD COLUMN IF NOT EXISTS "plan_type" text NOT NULL DEFAULT 'all_access';

-- 3. Create payment_requests table
CREATE TABLE IF NOT EXISTS "payment_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" text NOT NULL REFERENCES "users"("id"),
  "plan_id" text,
  "plan_reference_type" "payment_request_plan_type" NOT NULL DEFAULT 'membership',
  "plan_name" text NOT NULL,
  "plan_duration_months" integer,
  "plan_session_count" integer,
  "amount" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'MYR',
  "receipt_url" text,
  "status" "payment_request_status" NOT NULL DEFAULT 'pending_verification',
  "member_note" text,
  "admin_note" text,
  "approved_by" text REFERENCES "users"("id"),
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "subscription_id" text,
  "session_credit_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Indexes for payment_requests
CREATE INDEX IF NOT EXISTS "payment_requests_tenant_id_idx" ON "payment_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "payment_requests_customer_id_idx" ON "payment_requests"("customer_id");
CREATE INDEX IF NOT EXISTS "payment_requests_status_idx" ON "payment_requests"("tenant_id", "status");
