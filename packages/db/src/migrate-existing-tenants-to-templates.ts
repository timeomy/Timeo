import { runTenantTemplateMigration } from "./template-migration";

function printBusinessParity(
  before: {
    memberships: number;
    bookings: number;
    subscriptions: number;
    payments: number;
  },
  after: {
    memberships: number;
    bookings: number;
    subscriptions: number;
    payments: number;
  },
) {
  console.log("\nBusiness table row-count parity:");

  const rows: Array<keyof typeof before> = [
    "memberships",
    "bookings",
    "subscriptions",
    "payments",
  ];

  for (const tableName of rows) {
    const stable = before[tableName] === after[tableName] ? "OK" : "MISMATCH";
    console.log(
      `  ${tableName.padEnd(14)} before=${String(before[tableName]).padEnd(6)} after=${String(after[tableName]).padEnd(6)} ${stable}`,
    );
  }
}

async function run() {
  const hasExecuteFlag = process.argv.includes("--execute");
  const hasDryRunFlag = process.argv.includes("--dry-run");
  const execute = hasExecuteFlag && !hasDryRunFlag;

  const report = await runTenantTemplateMigration({
    execute,
    logger: (message) => console.log(message),
  });

  console.log("\nPlanned assignments:");
  for (const row of report.plan) {
    console.log(
      `  - ${row.tenantName} (${row.tenantId}) raw=${row.rawIndustry ?? "null"} normalized=${row.normalizedIndustry ?? "null"} status=${row.status}`,
    );
  }

  console.log("\nSummary:");
  console.log(`  total tenants:          ${report.summary.totalTenants}`);
  console.log(`  ready to assign:        ${report.summary.readyToAssign}`);
  console.log(`  skipped unknown:        ${report.summary.skippedUnknownIndustry}`);
  console.log(`  skipped missing config: ${report.summary.skippedMissingTemplate}`);

  if (report.mode === "execute") {
    console.log("\nExecuting assignment writes...");
    for (const action of report.assignmentActions) {
      console.log(
        `  ✓ ${action.tenantName}: assignment=${action.assignmentAction}, ui_overrides=${action.overrideAction}`,
      );
    }
  } else {
    console.log("\nDry-run mode: no database writes executed.");
  }

  printBusinessParity(report.businessCounts.before, report.businessCounts.after);
  console.log("\nMigration script complete.");
  process.exit(0);
}

run().catch((error) => {
  console.error("\nMigration script failed:", error);
  process.exit(1);
});
