DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'leg_day';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'back_day';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'shoulder_day';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'chest_day';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'arms_day';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'full_body';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'cardio';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'core';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "session_type" ADD VALUE IF NOT EXISTS 'custom';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "session_logs"
  ADD COLUMN IF NOT EXISTS "duration_minutes" integer,
  ADD COLUMN IF NOT EXISTS "client_feedback" text;

UPDATE "session_logs"
SET "duration_minutes" = ("metrics"->>'durationMinutes')::integer
WHERE "duration_minutes" IS NULL
  AND "metrics" ? 'durationMinutes'
  AND ("metrics"->>'durationMinutes') ~ '^[0-9]+$';
