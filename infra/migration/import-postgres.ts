/**
 * Import transformed data into PostgreSQL in FK dependency order.
 *
 * Reads from:  ./data/pg-import/<table>.json
 * Requires:    DATABASE_URL env var
 *
 * Tables are imported in order that respects foreign key constraints.
 * Uses batch inserts (chunks of 500) to avoid memory issues.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is required");
  process.exit(1);
}

const IMPORT_DIR = join(import.meta.dirname, "data", "pg-import");
const BATCH_SIZE = 500;

/**
 * Tables in FK dependency order. Each table only references tables above it.
 * Better Auth tables (user, session, account, verification) are managed
 * separately by Better Auth and NOT imported here.
 */
const IMPORT_ORDER = [
  // Tier 0: No FK dependencies
  "users",
  "platform_config",

  // Tier 1: References users only
  "tenants",          // → users (owner_id)
  "push_tokens",      // → users

  // Tier 2: References users + tenants
  "tenant_memberships", // → users, tenants
  "services",           // → tenants, users
  "products",           // → tenants, users
  "memberships",        // → tenants
  "business_hours",     // → tenants
  "staff_availability", // → users, tenants
  "feature_flags",      // → tenants
  "files",              // → tenants, users
  "notifications",      // → users, tenants
  "notification_preferences", // → users, tenants

  // Tier 3: References tier 2 tables
  "bookings",         // → tenants, users, services
  "orders",           // → tenants, users
  "vouchers",         // → tenants
  "gift_cards",       // → tenants
  "session_packages", // → tenants, services
  "blocked_slots",    // → tenants, users
  "check_ins",        // → tenants, users
  "member_qr_codes",  // → tenants, users
  "stripe_accounts",  // → tenants
  "audit_logs",       // → tenants, users

  // Tier 4: References tier 3 tables
  "booking_events",   // → tenants, bookings, users
  "order_items",      // → orders, products
  "payments",         // → tenants, users, orders, bookings
  "subscriptions",    // → tenants, users, memberships
  "pos_transactions", // → tenants, users, vouchers
  "voucher_redemptions", // → tenants, vouchers, users
  "session_credits",  // → tenants, users, session_packages
  "gift_card_transactions", // → gift_cards, tenants, users

  // Tier 5: References tier 4 tables
  "e_invoice_requests", // → tenants, pos_transactions
  "session_logs",       // → tenants, users, bookings, session_credits
] as const;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function importTable(
  sql: postgres.Sql,
  tableName: string,
): Promise<number> {
  const filePath = join(IMPORT_DIR, `${tableName}.json`);
  if (!existsSync(filePath)) {
    console.log(`  SKIP: No import file for "${tableName}"`);
    return 0;
  }

  const raw = readFileSync(filePath, "utf-8");
  const rows: Record<string, unknown>[] = JSON.parse(raw);

  if (rows.length === 0) {
    console.log(`  SKIP: "${tableName}" is empty`);
    return 0;
  }

  // Get column names from the first row
  const columns = Object.keys(rows[0]!);

  const batches = chunk(rows, BATCH_SIZE);
  let inserted = 0;

  for (const batch of batches) {
    try {
      for (const row of batch) {
        await sql`
          INSERT INTO ${sql(tableName)} ${sql(row as Record<string, unknown>, ...columns)}
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      }
    } catch (err) {
      console.error(`  ERROR inserting into "${tableName}" (batch):`, err);
      throw err;
    }
  }

  console.log(`  OK: ${tableName} ← ${inserted} rows`);
  return inserted;
}

async function main() {
  console.log("=== PostgreSQL Import ===\n");
  console.log(`Database: ${DATABASE_URL!.replace(/:[^@]+@/, ":***@")}\n`);

  const sql = postgres(DATABASE_URL!, { max: 5 });

  try {
    // Verify connection
    const [{ now }] = await sql`SELECT now()`;
    console.log(`Connected at ${now}\n`);

    // Disable FK checks during import for speed
    await sql`SET session_replication_role = 'replica'`;

    let totalRows = 0;
    const summary: Record<string, number> = {};

    for (const table of IMPORT_ORDER) {
      try {
        const count = await importTable(sql, table);
        summary[table] = count;
        totalRows += count;
      } catch (err) {
        console.error(`  FATAL: Failed to import "${table}". Stopping.`);
        // Re-enable FK checks before exiting
        await sql`SET session_replication_role = 'origin'`;
        await sql.end();
        process.exit(1);
      }
    }

    // Re-enable FK checks
    await sql`SET session_replication_role = 'origin'`;

    console.log(`\n✓ Imported ${totalRows} rows across ${IMPORT_ORDER.length} tables`);

    // Verify FK integrity now that constraints are back
    console.log("\nVerifying FK integrity...");
    const violations = await sql`
      SELECT conname, conrelid::regclass AS table_name
      FROM pg_constraint
      WHERE contype = 'f'
        AND NOT convalidated
    `;
    if (violations.length > 0) {
      console.warn("WARNING: Unvalidated FK constraints:", violations);
    } else {
      console.log("  ✓ All FK constraints valid");
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
