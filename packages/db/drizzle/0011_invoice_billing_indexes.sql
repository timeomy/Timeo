-- Migration: invoice indexing for billing/e-invoice production usage

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_invoice_number_idx"
  ON "invoices"("tenant_id", "invoice_number");

CREATE INDEX IF NOT EXISTS "invoices_tenant_status_idx"
  ON "invoices"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_tenant_issue_date_idx"
  ON "invoices"("tenant_id", "issue_date");
