import { sql } from "drizzle-orm";
import type { Database } from "./client.js";

export async function withTenantContext<T>(
  db: Database,
  tenantId: string,
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`,
    );
    return fn(tx as unknown as Database);
  });
}

export function rlsPolicySql(tableName: string): string {
  return [
    `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY "tenant_isolation" ON "${tableName}"`,
    `  USING (tenant_id = current_setting('app.current_tenant', true));`,
  ].join("\n");
}

export const TENANT_SCOPED_TABLES = [
  "services",
  "bookings",
  "booking_events",
  "staff_availability",
  "business_hours",
  "blocked_slots",
  "products",
  "orders",
  "memberships",
  "payments",
  "subscriptions",
  "stripe_accounts",
  "pos_transactions",
  "check_ins",
  "member_qr_codes",
  "session_packages",
  "session_credits",
  "session_logs",
  "vouchers",
  "voucher_redemptions",
  "gift_cards",
  "gift_card_transactions",
  "notifications",
  "notification_preferences",
  "e_invoice_requests",
] as const;

export function generateAllRlsPolicies(): string {
  return TENANT_SCOPED_TABLES.map(rlsPolicySql).join("\n\n");
}
