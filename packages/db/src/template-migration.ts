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

export const TEMPLATE_MIGRATION_WRITE_ALLOWLIST = [
  "tenant_template_assignments",
  "tenant_ui_overrides",
] as const;

const allowlistedWriteTables = new Set<string>(
  TEMPLATE_MIGRATION_WRITE_ALLOWLIST,
);

export type SupportedIndustry =
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

export interface MigrationPlanRow {
  tenantId: string;
  tenantName: string;
  rawIndustry: string | null;
  normalizedIndustry: SupportedIndustry | null;
  templateId: string | null;
  templateVersionId: string | null;
  status: PlanStatus;
  reason: string;
}

export interface BusinessTableCounts {
  memberships: number;
  bookings: number;
  subscriptions: number;
  payments: number;
}

interface AssignmentAction {
  tenantId: string;
  tenantName: string;
  assignmentAction: "inserted" | "updated";
  overrideAction: "existing" | "inserted";
}

export interface TenantTemplateMigrationReport {
  mode: "dry-run" | "execute";
  allowlistedWriteTables: readonly string[];
  plan: MigrationPlanRow[];
  summary: {
    totalTenants: number;
    readyToAssign: number;
    skippedUnknownIndustry: number;
    skippedMissingTemplate: number;
  };
  assignmentActions: AssignmentAction[];
  businessCounts: {
    before: BusinessTableCounts;
    after: BusinessTableCounts;
    parityOk: boolean;
  };
}

export interface RunTenantTemplateMigrationOptions {
  execute?: boolean;
  logger?: (message: string) => void;
}

function log(
  logger: RunTenantTemplateMigrationOptions["logger"],
  message: string,
) {
  if (logger) {
    logger(message);
  }
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

export function normalizeIndustry(rawIndustry: string | null): SupportedIndustry | null {
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
    return "inserted" as const;
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

  return "updated" as const;
}

async function ensureEmptyOverrideRow(plan: MigrationPlanRow) {
  assertWriteAllowed("tenant_ui_overrides");

  const existing = await db
    .select({ id: tenantUiOverrides.id })
    .from(tenantUiOverrides)
    .where(eq(tenantUiOverrides.tenant_id, plan.tenantId))
    .limit(1);

  if (existing.length > 0) {
    return "existing" as const;
  }

  await db.insert(tenantUiOverrides).values({
    id: generateId(),
    tenant_id: plan.tenantId,
    member_portal_override: {},
    admin_panel_override: {},
    revision: 0,
  });

  return "inserted" as const;
}

export async function runTenantTemplateMigration(
  options: RunTenantTemplateMigrationOptions = {},
): Promise<TenantTemplateMigrationReport> {
  const execute = options.execute === true;
  const logger = options.logger;

  log(
    logger,
    `Existing tenant template migration (${execute ? "EXECUTE" : "DRY RUN"})`,
  );
  log(
    logger,
    `Writes allowed only to: ${TEMPLATE_MIGRATION_WRITE_ALLOWLIST.join(", ")}`,
  );

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

  const templateByIndustry = new Map<
    SupportedIndustry,
    { id: string; versionId: string }
  >();

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

  const assignable = migrationPlan.filter((row) => row.status === "assign");
  const unknownIndustry = migrationPlan.filter(
    (row) => row.status === "skip_unknown_industry",
  );
  const missingTemplate = migrationPlan.filter(
    (row) => row.status === "skip_missing_template",
  );

  const assignmentActions: AssignmentAction[] = [];

  if (execute) {
    for (const row of assignable) {
      const assignmentAction = await upsertAssignment(row);
      const overrideAction = await ensureEmptyOverrideRow(row);

      assignmentActions.push({
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        assignmentAction,
        overrideAction,
      });
    }
  }

  const afterCounts = await readBusinessCounts();
  const parityOk =
    beforeCounts.memberships === afterCounts.memberships &&
    beforeCounts.bookings === afterCounts.bookings &&
    beforeCounts.subscriptions === afterCounts.subscriptions &&
    beforeCounts.payments === afterCounts.payments;

  if (!parityOk) {
    throw new Error("Business table row-count parity check failed");
  }

  if (unknownIndustry.length > 0) {
    log(logger, "Fail-closed report (unknown industries not assigned):");
    for (const row of unknownIndustry) {
      log(logger, `  - ${row.tenantName} raw=${row.rawIndustry ?? "null"}`);
    }
  }

  if (missingTemplate.length > 0) {
    log(logger, "Missing template report (industry has no published template):");
    for (const row of missingTemplate) {
      log(
        logger,
        `  - ${row.tenantName} normalized=${row.normalizedIndustry ?? "null"}`,
      );
    }
  }

  return {
    mode: execute ? "execute" : "dry-run",
    allowlistedWriteTables: TEMPLATE_MIGRATION_WRITE_ALLOWLIST,
    plan: migrationPlan,
    summary: {
      totalTenants: migrationPlan.length,
      readyToAssign: assignable.length,
      skippedUnknownIndustry: unknownIndustry.length,
      skippedMissingTemplate: missingTemplate.length,
    },
    assignmentActions,
    businessCounts: {
      before: beforeCounts,
      after: afterCounts,
      parityOk,
    },
  };
}
