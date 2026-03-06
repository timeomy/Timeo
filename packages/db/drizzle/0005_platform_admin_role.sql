-- Add platform-level role to users table
-- Values: "user" (default) or "platform_admin"
ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'user';

-- Set Jabez as platform admin
UPDATE "users" SET "role" = 'platform_admin' WHERE "email" = 'jabez@oxloz.com';
