import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

export type FeatureFlagSource = "override" | "template" | "global";
export type UiConfigScope = "member" | "admin";

export interface PlatformTemplateSummary {
  id: string;
  key: string;
  industry: string;
  name: string;
  status: "draft" | "published" | "archived";
  currentVersion: number;
  currentVersionId: string | null;
  currentVersionPublished: boolean;
  publishedAt: string | null;
  schemaVersion: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  schemaVersion: number;
  definition: Record<string, unknown>;
  isPublished: boolean;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface PlatformTemplateDetail {
  id: string;
  key: string;
  industry: string;
  name: string;
  status: "draft" | "published" | "archived";
  currentVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  versions: PlatformTemplateVersion[];
}

export interface TenantTemplateAssignment {
  id: string;
  templateId: string;
  templateVersionId: string;
  templateKey: string;
  templateName: string;
  templateIndustry: string;
  version: number;
  source: string;
  isPinned: boolean;
  appliedAt: string;
  industrySnapshot: string | null;
}

export interface PlatformTenantTemplateResponse {
  tenant: {
    id: string;
    name: string;
    settings: Record<string, unknown>;
  };
  assignment: TenantTemplateAssignment | null;
  templateDefinition: Record<string, unknown> | null;
  resolvedConfig: {
    memberPortal: Record<string, unknown>;
    adminPanel: Record<string, unknown>;
    featureDefaults: Record<string, boolean>;
  };
  overrides: {
    memberPortal: Record<string, unknown>;
    adminPanel: Record<string, unknown>;
    revision: number;
  };
}

export interface TenantUiConfigResponse {
  tenantId: string;
  assignment: TenantTemplateAssignment | null;
  resolved: Record<string, unknown>;
  override: Record<string, unknown>;
  revision: number;
}

export interface TenantUiResetResponse {
  tenantId: string;
  assignment: TenantTemplateAssignment | null;
  resolved: {
    memberPortal: Record<string, unknown>;
    adminPanel: Record<string, unknown>;
  };
  overrides: {
    memberPortal: Record<string, unknown>;
    adminPanel: Record<string, unknown>;
  };
  revision: number;
}

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

export interface EffectiveFeatureFlagsResponse {
  flags: Record<string, boolean>;
  sources: Record<string, FeatureFlagSource>;
  details: EffectiveFeatureFlag[];
}

export interface TemplateMigrationReport {
  mode: "dry-run" | "execute";
  allowlistedWriteTables: string[];
  plan: Array<{
    tenantId: string;
    tenantName: string;
    rawIndustry: string | null;
    normalizedIndustry: string | null;
    templateId: string | null;
    templateVersionId: string | null;
    status: "assign" | "skip_unknown_industry" | "skip_missing_template";
    reason: string;
  }>;
  summary: {
    totalTenants: number;
    readyToAssign: number;
    skippedUnknownIndustry: number;
    skippedMissingTemplate: number;
  };
  assignmentActions: Array<{
    tenantId: string;
    tenantName: string;
    assignmentAction: "inserted" | "updated";
    overrideAction: "existing" | "inserted";
  }>;
  businessCounts: {
    before: {
      memberships: number;
      bookings: number;
      subscriptions: number;
      payments: number;
    };
    after: {
      memberships: number;
      bookings: number;
      subscriptions: number;
      payments: number;
    };
    parityOk: boolean;
  };
}

export function usePlatformTemplates() {
  return useQuery({
    queryKey: queryKeys.platform.templates(),
    queryFn: () => api.get<PlatformTemplateSummary[]>("/api/platform/templates"),
  });
}

export function useCreatePlatformTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; industry: string; name: string }) =>
      api.post<PlatformTemplateSummary>("/api/platform/templates", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.templates() });
    },
  });
}

export function usePlatformTemplate(templateId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platform.template(templateId ?? ""),
    queryFn: () =>
      api.get<PlatformTemplateDetail>(`/api/platform/templates/${templateId}`),
    enabled: !!templateId,
  });
}

export function useTemplateVersions(templateId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platform.templateVersions(templateId ?? ""),
    queryFn: () =>
      api.get<PlatformTemplateDetail>(`/api/platform/templates/${templateId}`),
    enabled: !!templateId,
  });
}

export function useCreateTemplateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      definition,
    }: {
      templateId: string;
      definition: Record<string, unknown>;
    }) =>
      api.post<PlatformTemplateVersion>(
        `/api/platform/templates/${templateId}/versions`,
        { definition },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.templates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.template(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.templateVersions(variables.templateId),
      });
    },
  });
}

export function usePublishTemplateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      version,
    }: {
      templateId: string;
      version: number;
    }) =>
      api.post<PlatformTemplateVersion>(
        `/api/platform/templates/${templateId}/versions/${version}/publish`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.templates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.template(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.templateVersions(variables.templateId),
      });
    },
  });
}

export function usePlatformTenantTemplate(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platform.tenantTemplate(tenantId ?? ""),
    queryFn: () =>
      api.get<PlatformTenantTemplateResponse>(
        `/api/platform/tenants/${tenantId}/template`,
      ),
    enabled: !!tenantId,
  });
}

export function useAssignTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      templateId,
      version,
      isPinned,
    }: {
      tenantId: string;
      templateId: string;
      version?: number;
      isPinned?: boolean;
    }) =>
      api.post(`/api/platform/tenants/${tenantId}/template/assign`, {
        templateId,
        version,
        isPinned,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.templates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.tenantTemplate(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(variables.tenantId, "member"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(variables.tenantId, "admin"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.effectiveFeatureFlags(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.featureFlags(variables.tenantId),
      });
    },
  });
}

export function useTemplateMigrationPreview() {
  return useMutation({
    mutationFn: (confirmWriteTables?: string[]) =>
      api.post<TemplateMigrationReport>("/api/platform/template-migrations/preview", {
        confirmWriteTables,
      }),
  });
}

export function useTemplateMigrationExecute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (confirmWriteTables?: string[]) =>
      api.post<TemplateMigrationReport>("/api/platform/template-migrations/execute", {
        confirmWriteTables,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useTenantUiConfig(
  tenantId: string | null | undefined,
  scope: UiConfigScope,
) {
  return useQuery({
    queryKey: queryKeys.tenants.uiConfig(tenantId ?? "", scope),
    queryFn: () =>
      api.get<TenantUiConfigResponse>(`/api/tenants/${tenantId}/ui-config/${scope}`),
    enabled: !!tenantId,
  });
}

export function useUpdateTenantUiConfig(
  tenantId: string | null | undefined,
  scope: UiConfigScope,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (override: Record<string, unknown>) =>
      api.patch<TenantUiConfigResponse>(`/api/tenants/${tenantId}/ui-config/${scope}`, {
        override,
      }),
    onSuccess: () => {
      if (!tenantId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(tenantId, "member"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(tenantId, "admin"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.tenantTemplate(tenantId),
      });
    },
  });
}

export function useResetTenantUiConfig(tenantId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scope: "member" | "admin" | "all") =>
      api.post<TenantUiResetResponse>(`/api/tenants/${tenantId}/ui-config/reset`, {
        scope,
      }),
    onSuccess: () => {
      if (!tenantId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(tenantId, "member"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.uiConfig(tenantId, "admin"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.tenantTemplate(tenantId),
      });
    },
  });
}

export function useEffectiveFeatureFlags(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.effectiveFeatureFlags(tenantId ?? ""),
    queryFn: () =>
      api.get<EffectiveFeatureFlagsResponse>(
        `/api/tenants/${tenantId}/feature-flags`,
      ),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useUpdateTenantFeatureFlagOverride(
  tenantId: string | null | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      enabled,
      clearOverride,
    }: {
      key: string;
      enabled?: boolean;
      clearOverride?: boolean;
    }) =>
      api.patch<EffectiveFeatureFlagsResponse>(`/api/tenants/${tenantId}/feature-flags`, {
        key,
        enabled,
        clearOverride,
      }),
    onSuccess: () => {
      if (!tenantId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.effectiveFeatureFlags(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.featureFlags(tenantId),
      });
    },
  });
}
