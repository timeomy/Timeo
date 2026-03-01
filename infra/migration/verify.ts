/**
 * Verify migration integrity:
 * 1. Compare row counts between Convex export and PostgreSQL
 * 2. Check referential integrity (FK constraints)
 * 3. Spot-check data samples
 *
 * Requires: DATABASE_URL env var
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

interface ManifestData {
  tables: Record<string, number>;
  totalRows: number;
}

// ─── Row Count Comparison ───────────────────────────────────────────────────

const PG_TABLE_NAMES = [
  "users",
  "tenants",
  "tenant_memberships",
  "services",
  "bookings",
  "booking_events",
  "products",
  "orders",
  "order_items",
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
  "push_tokens",
  "staff_availability",
  "business_hours",
  "blocked_slots",
  "e_invoice_requests",
  "files",
  "feature_flags",
  "audit_logs",
  "platform_config",
];

async function verifyRowCounts(sql: postgres.Sql): Promise<boolean> {
  console.log("─── Row Count Verification ────────────────────────────────────\n");

  // Load the transform manifest for expected counts
  const manifestPath = join(IMPORT_DIR, "_manifest.json");
  let expectedCounts: Record<string, number> = {};

  if (existsSync(manifestPath)) {
    const manifest: ManifestData = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expectedCounts = manifest.tables;
  }

  let allMatch = true;
  const results: Array<{ table: string; expected: number; actual: number; status: string }> = [];

  for (const table of PG_TABLE_NAMES) {
    const [row] = await sql`
      SELECT count(*)::int AS count FROM ${sql(table)}
    `;
    const actual = row?.count ?? 0;
    const expected = expectedCounts[table] ?? 0;

    let status: string;
    if (expected === 0 && actual === 0) {
      status = "EMPTY";
    } else if (actual === expected) {
      status = "OK";
    } else if (actual > expected) {
      status = "EXTRA"; // Might have pre-existing data
    } else {
      status = "MISSING";
      allMatch = false;
    }

    results.push({ table, expected, actual, status });
  }

  // Print table
  console.log(
    "Table".padEnd(30) +
    "Expected".padStart(10) +
    "Actual".padStart(10) +
    "  Status",
  );
  console.log("-".repeat(62));

  for (const r of results) {
    const marker = r.status === "MISSING" ? "✗" : r.status === "OK" ? "✓" : "~";
    console.log(
      `${marker} ${r.table.padEnd(28)}${String(r.expected).padStart(10)}${String(r.actual).padStart(10)}  ${r.status}`,
    );
  }

  const totalExpected = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
  const totalActual = results.reduce((a, r) => a + r.actual, 0);
  console.log("-".repeat(62));
  console.log(
    `${"TOTAL".padEnd(30)}${String(totalExpected).padStart(10)}${String(totalActual).padStart(10)}`,
  );

  return allMatch;
}

// ─── FK Integrity Check ─────────────────────────────────────────────────────

async function verifyForeignKeys(sql: postgres.Sql): Promise<boolean> {
  console.log("\n─── Foreign Key Integrity ─────────────────────────────────────\n");

  // Check for orphaned references across key relationships
  const FK_CHECKS = [
    {
      label: "tenants.owner_id → users.id",
      query: sql`SELECT count(*) AS c FROM tenants t LEFT JOIN users u ON t.owner_id = u.id WHERE u.id IS NULL AND t.owner_id IS NOT NULL`,
    },
    {
      label: "tenant_memberships.user_id → users.id",
      query: sql`SELECT count(*) AS c FROM tenant_memberships tm LEFT JOIN users u ON tm.user_id = u.id WHERE u.id IS NULL`,
    },
    {
      label: "tenant_memberships.tenant_id → tenants.id",
      query: sql`SELECT count(*) AS c FROM tenant_memberships tm LEFT JOIN tenants t ON tm.tenant_id = t.id WHERE t.id IS NULL`,
    },
    {
      label: "bookings.service_id → services.id",
      query: sql`SELECT count(*) AS c FROM bookings b LEFT JOIN services s ON b.service_id = s.id WHERE s.id IS NULL`,
    },
    {
      label: "bookings.customer_id → users.id",
      query: sql`SELECT count(*) AS c FROM bookings b LEFT JOIN users u ON b.customer_id = u.id WHERE u.id IS NULL`,
    },
    {
      label: "orders.customer_id → users.id",
      query: sql`SELECT count(*) AS c FROM orders o LEFT JOIN users u ON o.customer_id = u.id WHERE u.id IS NULL`,
    },
    {
      label: "order_items.order_id → orders.id",
      query: sql`SELECT count(*) AS c FROM order_items oi LEFT JOIN orders o ON oi.order_id = o.id WHERE o.id IS NULL`,
    },
    {
      label: "payments.order_id → orders.id",
      query: sql`SELECT count(*) AS c FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE o.id IS NULL AND p.order_id IS NOT NULL`,
    },
    {
      label: "subscriptions.membership_id → memberships.id",
      query: sql`SELECT count(*) AS c FROM subscriptions s LEFT JOIN memberships m ON s.membership_id = m.id WHERE m.id IS NULL`,
    },
    {
      label: "session_credits.package_id → session_packages.id",
      query: sql`SELECT count(*) AS c FROM session_credits sc LEFT JOIN session_packages sp ON sc.package_id = sp.id WHERE sp.id IS NULL`,
    },
    {
      label: "e_invoice_requests.transaction_id → pos_transactions.id",
      query: sql`SELECT count(*) AS c FROM e_invoice_requests e LEFT JOIN pos_transactions pt ON e.transaction_id = pt.id WHERE pt.id IS NULL`,
    },
  ];

  let allClean = true;

  for (const check of FK_CHECKS) {
    const [row] = await check.query;
    const orphans = row?.c ?? 0;
    if (orphans > 0) {
      console.log(`  ✗ ${check.label}: ${orphans} orphaned rows`);
      allClean = false;
    } else {
      console.log(`  ✓ ${check.label}`);
    }
  }

  return allClean;
}

// ─── Data Sample Check ──────────────────────────────────────────────────────

async function verifySamples(sql: postgres.Sql): Promise<void> {
  console.log("\n─── Data Sample Checks ────────────────────────────────────────\n");

  // Check that IDs are nanoid format (21 chars, alphanumeric)
  const [idCheck] = await sql`
    SELECT count(*) AS c FROM users WHERE length(id) != 21
  `;
  console.log(`  ID length check (users): ${idCheck?.c === 0 ? "✓ All 21 chars" : `✗ ${idCheck?.c} rows with wrong length`}`);

  // Check money fields are in cents (should be > 100 for most real prices)
  const [priceCheck] = await sql`
    SELECT
      count(*) FILTER (WHERE price > 0 AND price < 10) AS suspicious_count,
      count(*) AS total
    FROM services
    WHERE price > 0
  `;
  if (priceCheck && priceCheck.total > 0 && priceCheck.suspicious_count > 0) {
    console.log(`  ⚠ Price sanity (services): ${priceCheck.suspicious_count}/${priceCheck.total} rows have price < 10 cents — check if conversion is needed`);
  } else {
    console.log(`  ✓ Price sanity (services): All prices look like cents`);
  }

  // Check timestamps are valid
  const [tsCheck] = await sql`
    SELECT count(*) AS c FROM users WHERE created_at < '2020-01-01'::timestamptz OR created_at > now() + interval '1 day'
  `;
  console.log(`  Timestamp sanity (users): ${tsCheck?.c === 0 ? "✓ All reasonable" : `⚠ ${tsCheck?.c} rows with suspicious timestamps`}`);

  // Check tenant count
  const [tenantCount] = await sql`SELECT count(*)::int AS c FROM tenants`;
  const [userCount] = await sql`SELECT count(*)::int AS c FROM users`;
  const [bookingCount] = await sql`SELECT count(*)::int AS c FROM bookings`;
  console.log(`\n  Summary: ${tenantCount?.c} tenants, ${userCount?.c} users, ${bookingCount?.c} bookings`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Migration Verification ===\n");
  console.log(`Database: ${DATABASE_URL!.replace(/:[^@]+@/, ":***@")}\n`);

  const sql = postgres(DATABASE_URL!, { max: 3 });

  try {
    const rowsOk = await verifyRowCounts(sql);
    const fkOk = await verifyForeignKeys(sql);
    await verifySamples(sql);

    console.log("\n═══════════════════════════════════════════════════════════════");
    if (rowsOk && fkOk) {
      console.log("  ✓ MIGRATION VERIFIED — all checks passed");
    } else {
      console.log("  ⚠ MIGRATION HAS ISSUES — review warnings above");
      if (!rowsOk) console.log("    - Row count mismatches detected");
      if (!fkOk) console.log("    - FK integrity violations detected");
    }
    console.log("═══════════════════════════════════════════════════════════════\n");

    process.exit(rowsOk && fkOk ? 0 : 1);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
