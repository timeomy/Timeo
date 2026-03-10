-- Add force_password_reset column to users table
-- Required for secure tenant onboarding: invited users must change their temp password on first login

ALTER TABLE "users" ADD COLUMN "force_password_reset" boolean DEFAULT false NOT NULL;
