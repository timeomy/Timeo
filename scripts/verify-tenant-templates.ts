import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "../packages/db/src/client";
import { bookings } from "../packages/db/src/schema/booking";
import { memberships } from "../packages/db/src/schema/commerce";
import { payments, subscriptions } from "../packages/db/src/schema/payments";

interface BusinessCounts {
  memberships: number;
  bookings: number;
  subscriptions: number;
  payments: number;
}

const requiredTables = [
  "tenant_templates",
  "tenant_template_versions",
  "tenant_template_assignments",
  "tenant_ui_overrides",
];

async function readCount(table: "tenant_templates" | "tenant_template_versions") {
  const [row] =
    table === "tenant_templates"
      ? await db.execute(sql`SELECT COUNT(*)::int AS count FROM tenant_templates`)
      : await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM tenant_template_versions`,
        );
  return Number((row as { count: number }).count);
}

async function readBusinessCounts(): Promise<BusinessCounts> {
  const [membershipsCountRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(memberships);
  const [bookingsCountRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(bookings);
  const [subscriptionsCountRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(subscriptions);
  const [paymentsCountRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(payments);

  return {
    memberships: Number(membershipsCountRow?.count ?? 0),
    bookings: Number(bookingsCountRow?.count ?? 0),
    subscriptions: Number(subscriptionsCountRow?.count ?? 0),
    payments: Number(paymentsCountRow?.count ?? 0),
  };
}

function printParity(before: BusinessCounts, after: BusinessCounts) {
  console.log("\nBusiness row-count parity:");
  const rows: Array<keyof BusinessCounts> = [
    "memberships",
    "bookings",
    "subscriptions",
    "payments",
  ];

  for (const key of rows) {
    const ok = before[key] === after[key] ? "OK" : "MISMATCH";
    console.log(
      `  ${key.padEnd(14)} before=${String(before[key]).padEnd(6)} after=${String(after[key]).padEnd(6)} ${ok}`,
    );
  }
}

async function verifyTablesExist() {
  const missing: string[] = [];

  for (const tableName of requiredTables) {
    const [row] = await db.execute(
      sql`SELECT to_regclass(${`public.${tableName}`}) AS regclass`,
    );

    if (!(row as { regclass: string | null }).regclass) {
      missing.push(tableName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required tables: ${missing.join(", ")}`);
  }

  console.log("✓ Required tenant template tables exist");
}

async function verifySeededTemplates() {
  const templateCount = await readCount("tenant_templates");
  const versionCount = await readCount("tenant_template_versions");

  if (templateCount !== 9) {
    throw new Error(`Expected 9 templates, found ${templateCount}`);
  }

  if (versionCount < 9) {
    throw new Error(`Expected at least 9 template versions, found ${versionCount}`);
  }

  const [publishedCountRow] = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM tenant_template_versions
    WHERE is_published = true
  `);

  const publishedCount = Number((publishedCountRow as { count: number }).count);

  if (publishedCount < 9) {
    throw new Error(`Expected at least 9 published template versions, found ${publishedCount}`);
  }

  console.log("✓ Template seed check passed (9 templates, published versions present)");
}

async function run() {
  const executeMigration = process.argv.includes("--execute-migration");
  const migrationMode = executeMigration ? "--execute" : "--dry-run";

  console.log("\nVerifying tenant template Stage 2 state...");
  await verifyTablesExist();
  await verifySeededTemplates();

  const beforeCounts = await readBusinessCounts();

  console.log(`\nRunning migration script in ${migrationMode} mode for parity verification...`);
  execSync(
    `npx tsx packages/db/src/migrate-existing-tenants-to-templates.ts ${migrationMode}`,
    {
      stdio: "inherit",
    },
  );

  const afterCounts = await readBusinessCounts();
  printParity(beforeCounts, afterCounts);

  const parityOk =
    beforeCounts.memberships === afterCounts.memberships &&
    beforeCounts.bookings === afterCounts.bookings &&
    beforeCounts.subscriptions === afterCounts.subscriptions &&
    beforeCounts.payments === afterCounts.payments;

  if (!parityOk) {
    throw new Error("Business data parity check failed");
  }

  console.log("\n✓ Verification complete: no business table row counts changed");
  process.exit(0);
}

run().catch((error) => {
  console.error("\nVerification failed:", error);
  process.exit(1);
});
