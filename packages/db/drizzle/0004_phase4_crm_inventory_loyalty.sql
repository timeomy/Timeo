-- Phase 4: CRM, Inventory, Loyalty
-- Stock fields on products
ALTER TABLE "products" ADD COLUMN "sku" text;
ALTER TABLE "products" ADD COLUMN "stock_quantity" integer;
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer NOT NULL DEFAULT 5;

-- CRM fields on tenant_memberships
ALTER TABLE "tenant_memberships" ADD COLUMN "notes" text;
ALTER TABLE "tenant_memberships" ADD COLUMN "tags" jsonb NOT NULL DEFAULT '[]';

-- Stock movements table
CREATE TABLE "stock_movements" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "delta" integer NOT NULL,
  "stock_before" integer NOT NULL,
  "stock_after" integer NOT NULL,
  "reason" text NOT NULL,
  "reference_id" text,
  "actor_id" text REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- Loyalty points table
CREATE TABLE "loyalty_points" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "balance" integer NOT NULL DEFAULT 0,
  "lifetime_earned" integer NOT NULL DEFAULT 0,
  "lifetime_redeemed" integer NOT NULL DEFAULT 0,
  "tier" text NOT NULL DEFAULT 'bronze',
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "loyalty_points_tenant_user_idx" ON "loyalty_points"("tenant_id", "user_id");
CREATE INDEX "loyalty_points_tenant_id_idx" ON "loyalty_points"("tenant_id");

-- Loyalty transactions table
CREATE TABLE "loyalty_transactions" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL CHECK ("type" IN ('earned', 'redeemed', 'expired', 'adjusted')),
  "points" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reference_type" text,
  "reference_id" text,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "loyalty_transactions_tenant_user_idx" ON "loyalty_transactions"("tenant_id", "user_id");
CREATE INDEX "loyalty_transactions_tenant_id_idx" ON "loyalty_transactions"("tenant_id");
