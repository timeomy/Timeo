/**
 * Export all Convex tables to JSON files in ./data/convex-export/
 *
 * Uses the Convex HTTP export API to download each table as JSON.
 * Requires CONVEX_URL env var (e.g., https://mild-gnat-567.convex.cloud)
 * and CONVEX_DEPLOY_KEY for admin-level access.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// All known Convex table names (camelCase, as stored in Convex)
const CONVEX_TABLES = [
  "users",
  "tenants",
  "tenantMemberships",
  "services",
  "bookings",
  "bookingEvents",
  "products",
  "orders",
  "orderItems",
  "memberships",
  "payments",
  "subscriptions",
  "stripeAccounts",
  "posTransactions",
  "checkIns",
  "memberQrCodes",
  "sessionPackages",
  "sessionCredits",
  "sessionLogs",
  "vouchers",
  "giftCards",
  "notifications",
  "pushTokens",
  "staffAvailability",
  "businessHours",
  "blockedSlots",
  "eInvoiceRequests",
  "files",
  "featureFlags",
  "auditLogs",
  "platformConfig",
] as const;

const CONVEX_URL = process.env.CONVEX_URL;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;

if (!CONVEX_URL) {
  console.error("ERROR: CONVEX_URL is required (e.g., https://mild-gnat-567.convex.cloud)");
  process.exit(1);
}
if (!CONVEX_DEPLOY_KEY) {
  console.error("ERROR: CONVEX_DEPLOY_KEY is required for admin API access");
  process.exit(1);
}

const OUTPUT_DIR = join(import.meta.dirname, "data", "convex-export");

async function exportTable(tableName: string): Promise<number> {
  const url = `${CONVEX_URL}/api/list_snapshot`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${CONVEX_DEPLOY_KEY}`,
    },
    body: JSON.stringify({
      tableName,
      format: "convex_json",
    }),
  });

  if (!response.ok) {
    // Table might not exist — not a fatal error
    if (response.status === 404) {
      console.warn(`  SKIP: Table "${tableName}" not found in Convex`);
      return 0;
    }
    const text = await response.text();
    throw new Error(`Failed to export "${tableName}": ${response.status} ${text}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data) ? data : data.documents ?? data.rows ?? [];

  const outPath = join(OUTPUT_DIR, `${tableName}.json`);
  writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`  OK: ${tableName} → ${rows.length} rows`);
  return rows.length;
}

async function main() {
  console.log("=== Convex Data Export ===\n");
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Output dir: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalRows = 0;
  const summary: Record<string, number> = {};

  for (const table of CONVEX_TABLES) {
    try {
      const count = await exportTable(table);
      summary[table] = count;
      totalRows += count;
    } catch (err) {
      console.error(`  ERROR exporting "${table}":`, err);
      summary[table] = -1;
    }
  }

  // Write export manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    convexUrl: CONVEX_URL,
    tables: summary,
    totalRows,
  };
  writeFileSync(join(OUTPUT_DIR, "_manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Exported ${totalRows} total rows across ${Object.keys(summary).length} tables`);
  console.log(`Manifest written to ${join(OUTPUT_DIR, "_manifest.json")}`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
