import { and, eq } from "drizzle-orm";
import { db } from "@timeo/db";
import {
  featureFlagOverrides,
  featureFlags,
  tenantTemplateAssignments,
  tenantTemplateVersions,
  tenantTemplates,
  tenantUiOverrides,
} from "@timeo/db/schema";
import {
  tenantTemplateDefinitionSchema,
  type AdminPanelConfig,
  type MemberPortalConfig,
  type TenantTemplateDefinition,
} from "../lib/template-schema.js";

type UnknownRecord = Record<string, unknown>;

export type FeatureFlagSource = "override" | "template" | "global";

export interface EffectiveFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  phase: string | null;
  enabled: boolean;
  source: FeatureFlagSource;
  defaultEnabled: boolean;
  templateDefault: boolean | null;
}

export interface ResolvedTenantUiConfig {
  tenantId: string;
  assignment: {
    id: string;
    templateId: string;
    templateVersionId: string;
    templateKey: string;
    templateName: string;
    templateIndustry: string;
    version: number;
    source: string;
    isPinned: boolean;
    appliedAt: Date;
    industrySnapshot: string | null;
  } | null;
  templateDefinition: TenantTemplateDefinition | null;
  memberOverride: UnknownRecord;
  adminOverride: UnknownRecord;
  memberPortal: MemberPortalConfig | UnknownRecord;
  adminPanel: AdminPanelConfig | UnknownRecord;
  featureDefaults: Record<string, boolean>;
  overrideRevision: number;
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): UnknownRecord {
  return isPlainObject(value) ? value : {};
}

function mergeTemplateConfig<T>(base: T, override: unknown): T {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base)) {
    if (Array.isArray(override)) {
      return override as T;
    }
    return base;
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(override)) {
      return base;
    }

    const merged: UnknownRecord = { ...base };
    for (const [key, overrideValue] of Object.entries(override)) {
      const baseValue = (base as UnknownRecord)[key];
      if (baseValue === undefined) {
        merged[key] = overrideValue;
      } else {
        merged[key] = mergeTemplateConfig(baseValue, overrideValue);
      }
    }

    return merged as T;
  }

  return override as T;
}

export async function resolveTenantUiConfig(
  tenantId: string,
): Promise<ResolvedTenantUiConfig> {
  const [assignmentRow, overrideRow] = await Promise.all([
    db
      .select({
        assignmentId: tenantTemplateAssignments.id,
        templateId: tenantTemplateAssignments.template_id,
        templateVersionId: tenantTemplateAssignments.template_version_id,
        industrySnapshot: tenantTemplateAssignments.industry_snapshot,
        source: tenantTemplateAssignments.source,
        isPinned: tenantTemplateAssignments.is_pinned,
        appliedAt: tenantTemplateAssignments.applied_at,
        templateKey: tenantTemplates.key,
        templateName: tenantTemplates.name,
        templateIndustry: tenantTemplates.industry,
        version: tenantTemplateVersions.version,
        definition: tenantTemplateVersions.definition,
      })
      .from(tenantTemplateAssignments)
      .innerJoin(
        tenantTemplates,
        eq(tenantTemplateAssignments.template_id, tenantTemplates.id),
      )
      .innerJoin(
        tenantTemplateVersions,
        and(
          eq(
            tenantTemplateAssignments.template_version_id,
            tenantTemplateVersions.id,
          ),
          eq(tenantTemplateVersions.template_id, tenantTemplates.id),
        ),
      )
      .where(eq(tenantTemplateAssignments.tenant_id, tenantId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        memberPortalOverride: tenantUiOverrides.member_portal_override,
        adminPanelOverride: tenantUiOverrides.admin_panel_override,
        revision: tenantUiOverrides.revision,
      })
      .from(tenantUiOverrides)
      .where(eq(tenantUiOverrides.tenant_id, tenantId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const memberOverride = asObject(overrideRow?.memberPortalOverride ?? {});
  const adminOverride = asObject(overrideRow?.adminPanelOverride ?? {});
  const overrideRevision = overrideRow?.revision ?? 0;

  if (!assignmentRow) {
    return {
      tenantId,
      assignment: null,
      templateDefinition: null,
      memberOverride,
      adminOverride,
      memberPortal: mergeTemplateConfig({}, memberOverride),
      adminPanel: mergeTemplateConfig({}, adminOverride),
      featureDefaults: {},
      overrideRevision,
    };
  }

  const parsedDefinition = tenantTemplateDefinitionSchema.parse(
    assignmentRow.definition,
  );

  return {
    tenantId,
    assignment: {
      id: assignmentRow.assignmentId,
      templateId: assignmentRow.templateId,
      templateVersionId: assignmentRow.templateVersionId,
      templateKey: assignmentRow.templateKey,
      templateName: assignmentRow.templateName,
      templateIndustry: assignmentRow.templateIndustry,
      version: assignmentRow.version,
      source: assignmentRow.source,
      isPinned: assignmentRow.isPinned,
      appliedAt: assignmentRow.appliedAt,
      industrySnapshot: assignmentRow.industrySnapshot,
    },
    templateDefinition: parsedDefinition,
    memberOverride,
    adminOverride,
    memberPortal: mergeTemplateConfig(parsedDefinition.memberPortal, memberOverride),
    adminPanel: mergeTemplateConfig(parsedDefinition.adminPanel, adminOverride),
    featureDefaults: parsedDefinition.featureDefaults,
    overrideRevision,
  };
}

export async function getEffectiveFeatureFlags(
  tenantId: string,
): Promise<EffectiveFeatureFlag[]> {
  const [resolvedUiConfig, allFlags, tenantOverrides] = await Promise.all([
    resolveTenantUiConfig(tenantId),
    db.select().from(featureFlags),
    db
      .select()
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.tenant_id, tenantId)),
  ]);

  const templateDefaults = resolvedUiConfig.featureDefaults;
  const overrideByFlagId = new Map(
    tenantOverrides.map((override) => [override.feature_flag_id, override.enabled]),
  );

  return allFlags.map((flag) => {
    const explicitOverride = overrideByFlagId.get(flag.id);
    const templateDefault =
      typeof templateDefaults[flag.key] === "boolean"
        ? templateDefaults[flag.key]
        : null;

    if (typeof explicitOverride === "boolean") {
      return {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        phase: flag.phase,
        enabled: explicitOverride,
        source: "override" as const,
        defaultEnabled: flag.default_enabled,
        templateDefault,
      };
    }

    if (typeof templateDefault === "boolean") {
      return {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        phase: flag.phase,
        enabled: templateDefault,
        source: "template" as const,
        defaultEnabled: flag.default_enabled,
        templateDefault,
      };
    }

    return {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      phase: flag.phase,
      enabled: flag.default_enabled,
      source: "global" as const,
      defaultEnabled: flag.default_enabled,
      templateDefault,
    };
  });
}
