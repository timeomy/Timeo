-- Add is_public column to tenants for public business directory
ALTER TABLE "tenants" ADD COLUMN "is_public" boolean NOT NULL DEFAULT false;

-- Index for efficient filtering of public tenants
CREATE INDEX "tenants_is_public_idx" ON "tenants" ("is_public");
