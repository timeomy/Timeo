import { and, eq, sql } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "./client";
import { generateId } from "./id";
import { bookings } from "./schema/booking";
import { memberships } from "./schema/commerce";
import { tenants } from "./schema/core";
import { payments, subscriptions } from "./schema/payments";
import {
  tenantTemplateAssignments,
  tenantTemplateVersions,
  tenantTemplates,
  tenantUiOverrides,
} from "./schema/tenant-templates";

const allowlistedWriteTables = new Set([
  "tenant_template_assignments",
  "tenant_ui_overrides",
]);

type SupportedIndustry =
  | "fitness"
  | "salon"
  | "mssp"
  | "retail"
  | "restaurant"
  | "wellness"
  | "coaching"
  | "physio"
  | "clinic";

type PlanStatus = "assign" | "skip_unknown_industry" | "skip_missing_template";

interface MigrationPlanRow {
  tenantId: string;
  tenantName: string;
  rawIndustry: string | null;
  normalizedIndustry: SupportedIndustry | null;
  templateId: string | null;
  templateVersionId: string | null;
  status: PlanStatus;
  reason: string;
}

interface BusinessTableCounts {
  memberships: number;
  bookings: number;
  subscriptions: number;
  payments: number;
}

function assertWriteAllowed(tableName: string) {
  if (!allowlistedWriteTables.has(tableName)) {
    throw new Error(
      `Blocked write: table \"${tableName}\" is not in allowlist (${Array.from(allowlistedWriteTables).join(", ")})`,
    );
  }
}

function extractIndustry(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const candidate = (settings as Record<string, unknown>).industry;
  return typeof candidate === "string" ? candidate : null;
}

function normalizeIndustry(rawIndustry: string | null): SupportedIndustry | null {
  if (!rawIndustry) return null;

  const key = rawIndustry
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const normalizedMap: Record<string, SupportedIndustry> = {
    fitness: "fitness",
    gym: "fitness",
    salon: "salon",
    beauty: "salon",
    mssp: "mssp",
    "managed security": "mssp",
    "managed security services": "mssp",
    retail: "retail",
    "oil palm": "retail",
    "oil palm company": "retail",
    restaurant: "restaurant",
    fnb: "restaurant",
    "food and beverage": "restaurant",
    wellness: "wellness",
    coaching: "coaching",
    physio: "physio",
    physiotherapy: "physio",
    clinic: "clinic",
    medical: "clinic",
  };

  return normalizedMap[key] ?? null;
}

async function readCount(table: AnyPgTable) {
  const result = await db.select({ count: sql<string>`count(*)` }).from(table);
  return Number(result[0]?.count ?? 0);
}

async function readBusinessCounts(): Promise<BusinessTableCounts> {
  return {
    memberships: await readCount(memberships),
    bookings: await readCount(bookings),
    subscriptions: await readCount(subscriptions),
    payments: await readCount(payments),
  };
}

function printBusinessParity(before: BusinessTableCounts, after: BusinessTableCounts) {
  console.log("\nBusiness table row-count parity:");

  const rows: Array<keyof BusinessTableCounts> = [
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

async function upsertAssignment(plan: MigrationPlanRow) {
  assertWriteAllowed("tenant_template_assignments");

  const existing = await db
    .select({ id: tenantTemplateAssignments.id })
    .from(tenantTemplateAssignments)
    .where(eq(tenantTemplateAssignments.tenant_id, plan.tenantId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(tenantTemplateAssignments).values({
      id: generateId(),
      tenant_id: plan.tenantId,
      template_id: plan.templateId!,
      template_version_id: plan.templateVersionId!,
      industry_snapshot: plan.normalizedIndustry,
      source: "stage2_existing_tenant_migration",
      is_pinned: false,
      applied_at: new Date(),
    });
    return "inserted";
  }

  await db
    .update(tenantTemplateAssignments)
    .set({
      template_id: plan.templateId!,
      template_version_id: plan.templateVersionId!,
      industry_snapshot: plan.normalizedIndustry,
      source: "stage2_existing_tenant_migration",
      is_pinned: false,
      applied_at: new Date(),
    })
    .where(eq(tenantTemplateAssignments.id, existing[0].id));

  return "updated";
}

async function ensureEmptyOverrideRow(plan: MigrationPlanRow) {
  assertWriteAllowed("tenant_ui_overrides");

  const existing = await db
    .select({ id: tenantUiOverrides.id })
    .from(tenantUiOverrides)
    .where(eq(tenantUiOverrides.tenant_id, plan.tenantId))
    .limit(1);

  if (existing.length > 0) {
    return "existing";
  }

  await db.insert(tenantUiOverrides).values({
    id: generateId(),
    tenant_id: plan.tenantId,
    member_portal_override: {},
    admin_panel_override: {},
    revision: 0,
  });

  return "inserted";
}

async function run() {
  const hasExecuteFlag = process.argv.includes("--execute");
  const hasDryRunFlag = process.argv.includes("--dry-run");
  const execute = hasExecuteFlag && !hasDryRunFlag;
  const mode = execute ? "EXECUTE" : "DRY RUN";

  console.log(`\nExisting tenant template migration (${mode})`);
  console.log("Writes allowed only to: tenant_template_assignments, tenant_ui_overrides");

  const beforeCounts = await readBusinessCounts();

  const publishedTemplateRows = await db
    .select({
      templateId: tenantTemplates.id,
      templateKey: tenantTemplates.key,
      currentVersion: tenantTemplates.current_version,
      templateVersionId: tenantTemplateVersions.id,
      version: tenantTemplateVersions.version,
    })
    .from(tenantTemplates)
    .innerJoin(
      tenantTemplateVersions,
      and(
        eq(tenantTemplateVersions.template_id, tenantTemplates.id),
        eq(tenantTemplateVersions.version, tenantTemplates.current_version),
      ),
    )
    .where(eq(tenantTemplateVersions.is_published, true));

  const templateByIndustry = new Map<SupportedIndustry, { id: string; versionId: string }>();

  for (const row of publishedTemplateRows) {
    const key = row.templateKey as SupportedIndustry;
    if (!templateByIndustry.has(key)) {
      templateByIndustry.set(key, {
        id: row.templateId,
        versionId: row.templateVersionId,
      });
    }
  }

  const tenantRows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      settings: tenants.settings,
    })
    .from(tenants);

  const migrationPlan: MigrationPlanRow[] = tenantRows.map((tenant) => {
    const rawIndustry = extractIndustry(tenant.settings);
    const normalizedIndustry = normalizeIndustry(rawIndustry);

    if (!normalizedIndustry) {
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        rawIndustry,
        normalizedIndustry,
        templateId: null,
        templateVersionId: null,
        status: "skip_unknown_industry",
        reason: "unknown_or_unsupported_industry",
      };
    }

    const template = templateByIndustry.get(normalizedIndustry);
    if (!template) {
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        rawIndustry,
        normalizedIndustry,
        templateId: null,
        templateVersionId: null,
        status: "skip_missing_template",
        reason: "no_published_template_for_industry",
      };
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      rawIndustry,
      normalizedIndustry,
      templateId: template.id,
      templateVersionId: template.versionId,
      status: "assign",
      reason: "ready",
    };
  });

  console.log("\nPlanned assignments:");
  for (const row of migrationPlan) {
    console.log(
      `  - ${row.tenantName} (${row.tenantId}) raw=${row.rawIndustry ?? "null"} normalized=${row.normalizedIndustry ?? "null"} status=${row.status}`,
    );
  }

  const assignable = migrationPlan.filter((row) => row.status === "assign");
  const unknownIndustry = migrationPlan.filter(
    (row) => row.status === "skip_unknown_industry",
  );
  const missingTemplate = migrationPlan.filter(
    (row) => row.status === "skip_missing_template",
  );

  console.log("\nSummary:");
  console.log(`  total tenants:          ${migrationPlan.length}`);
  console.log(`  ready to assign:        ${assignable.length}`);
  console.log(`  skipped unknown:        ${unknownIndustry.length}`);
  console.log(`  skipped missing config: ${missingTemplate.length}`);

  if (execute) {
    console.log("\nExecuting assignment writes...");

    for (const row of assignable) {
      const assignmentAction = await upsertAssignment(row);
      const overrideAction = await ensureEmptyOverrideRow(row);

      console.log(
        `  ✓ ${row.tenantName}: assignment=${assignmentAction}, ui_overrides=${overrideAction}`,
      );
    }
  } else {
    console.log("\nDry-run mode: no database writes executed.");
  }

  const afterCounts = await readBusinessCounts();
  printBusinessParity(beforeCounts, afterCounts);

  const parityOk =
    beforeCounts.memberships === afterCounts.memberships &&
    beforeCounts.bookings === afterCounts.bookings &&
    beforeCounts.subscriptions === afterCounts.subscriptions &&
    beforeCounts.payments === afterCounts.payments;

  if (!parityOk) {
    throw new Error("Business table row-count parity check failed");
  }

  if (unknownIndustry.length > 0) {
    console.log("\nFail-closed report (unknown industries not assigned):");
    for (const row of unknownIndustry) {
      console.log(`  - ${row.tenantName} raw=${row.rawIndustry ?? "null"}`);
    }
  }

  console.log("\nMigration script complete.");
  process.exit(0);
}

run().catch((error) => {
  console.error("\nMigration script failed:", error);
  process.exit(1);
});
