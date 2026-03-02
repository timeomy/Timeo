-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Enable Row Level Security on all tenant-scoped tables.
-- The tenant middleware calls SET LOCAL app.current_tenant = '<tenantId>'
-- before every query, enforcing isolation at the database level.

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "services"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "bookings"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "booking_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "booking_events"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "staff_availability" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "staff_availability"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "business_hours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "business_hours"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "blocked_slots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "blocked_slots"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "products"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "orders"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "memberships"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "payments"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "subscriptions"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "stripe_accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "stripe_accounts"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "pos_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "pos_transactions"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "check_ins"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "member_qr_codes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "member_qr_codes"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "session_packages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "session_packages"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "session_credits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "session_credits"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "session_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "session_logs"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "vouchers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vouchers"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "voucher_redemptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "voucher_redemptions"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "gift_cards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "gift_cards"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "gift_card_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "gift_card_transactions"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "notifications"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "notification_preferences"
  USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE "e_invoice_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "e_invoice_requests"
  USING (tenant_id = current_setting('app.current_tenant', true));
