import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  mrr: number;
  revenue: number;
}

export interface TenantMember {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  userName: string;
  userEmail: string;
}

export interface PlatformUser {
  id: string;
  authId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  tenantCount: number;
  role: string;
  status: string;
}

export interface PlatformUserDetail extends PlatformUser {
  memberships: Array<{
    id: string;
    tenantId: string;
    role: string;
    status: string;
    joinedAt: string;
  }>;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  interval: string;
  features: string[];
  limits: Record<string, unknown>;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultEnabled: boolean;
  enabled: boolean;
  phase: string | null;
  createdAt: string;
  updatedAt: string;
  overrides: Array<{ tenantId: string; enabled: boolean }>;
}

export interface PlatformConfig {
  [section: string]: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  tenantId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "critical";
  target: "all" | "admins";
  active: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface EmailTemplate {
  id: string;
  key: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  variables: Array<{ name: string; description: string }>;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  tenantId: string | null;
  name: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResponse extends ApiKey {
  key: string; // plaintext, shown once
}

export interface HealthStatus {
  status: "healthy" | "degraded";
  checks: Record<string, unknown>;
}

export interface AnalyticsOverview {
  totalTenants: number;
  totalUsers: number;
  activeMembers24h: number;
  todayRevenue: number;
  ordersToday: number;
  todayStart: string;
}

export interface TenantGrowthPoint {
  date: string;
  count: number;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants30d: number;
  newTenants30d: number;
  mrr: number;
  arr: number;
  churnRate30d: number;
}

export interface PlatformLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  tenantId: string | null;
  targetName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

// ─── MODULE 1: Tenants ───────────────────────────────────────────────────────

export function usePlatformTenants() {
  return useQuery({
    queryKey: queryKeys.platform.tenants(),
    queryFn: () => api.get<PlatformTenant[]>("/api/platform/tenants"),
    staleTime: 30_000,
  });
}

export function usePlatformTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.platform.tenant(id),
    queryFn: () =>
      api.get<PlatformTenant & { memberCount: number }>(
        `/api/platform/tenants/${id}`,
      ),
    enabled: !!id,
  });
}

export function usePlatformTenantMembers(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.platform.tenantMembers(tenantId),
    queryFn: () =>
      api.get<TenantMember[]>(`/api/platform/tenants/${tenantId}/members`),
    enabled: !!tenantId,
  });
}

export function useCreatePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      ownerEmail: string;
      plan?: string;
    }) => api.post<PlatformTenant>("/api/platform/tenants", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenants() }),
  });
}

export function useSuspendPlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/platform/tenants/${id}/suspend`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenant(id) });
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useActivatePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/platform/tenants/${id}/activate`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenant(id) });
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useDeletePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/platform/tenants/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenants() }),
  });
}

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ token: string; expiresIn: number; tenantId: string }>(
        `/api/platform/tenants/${id}/impersonate`,
      ),
  });
}

export function useUpdatePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; plan?: string; status?: string } & Record<string, unknown>) =>
      api.patch<PlatformTenant>(`/api/platform/tenants/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenant(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

// ─── MODULE 2: Users ─────────────────────────────────────────────────────────

export function usePlatformUsers() {
  return useQuery({
    queryKey: queryKeys.platform.users(),
    queryFn: () => api.get<PlatformUser[]>("/api/platform/users"),
    staleTime: 30_000,
  });
}

export function usePlatformUser(id: string) {
  return useQuery({
    queryKey: queryKeys.platform.user(id),
    queryFn: () => api.get<PlatformUserDetail>(`/api/platform/users/${id}`),
    enabled: !!id,
  });
}

export function useDeactivatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/platform/users/${id}/deactivate`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.platform.user(id) });
      qc.invalidateQueries({ queryKey: queryKeys.platform.users() });
    },
  });
}

export function useForceLogoutPlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/platform/users/${id}/sessions`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.platform.user(id) });
    },
  });
}

// ─── MODULE 3: Plans ─────────────────────────────────────────────────────────

export function usePlatformPlans() {
  return useQuery({
    queryKey: queryKeys.platform.plans(),
    queryFn: () => api.get<Plan[]>("/api/platform/plans"),
    staleTime: 60_000,
  });
}

export function useCreatePlatformPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      price_cents: number;
      interval?: string;
      features?: string[];
      limits?: Record<string, unknown>;
      active?: boolean;
      sort_order?: number;
    }) => api.post<Plan>("/api/platform/plans", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.plans() }),
  });
}

export function useUpdatePlatformPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.put<Plan>(`/api/platform/plans/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.plans() }),
  });
}

export function useDeletePlatformPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/platform/plans/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.plans() }),
  });
}

// ─── MODULE 4: Feature Flags ─────────────────────────────────────────────────

export function usePlatformFlags() {
  return useQuery({
    queryKey: queryKeys.platform.flags(),
    queryFn: () => api.get<FeatureFlag[]>("/api/platform/feature-flags"),
    staleTime: 30_000,
  });
}

export function useCreatePlatformFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      key: string;
      name: string;
      description?: string;
      default_enabled?: boolean;
      phase?: string;
    }) => api.post<FeatureFlag>("/api/platform/feature-flags", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.flags() }),
  });
}

export function useUpdatePlatformFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      key,
      ...data
    }: {
      id?: string;
      key?: string;
      name?: string;
      description?: string;
      default_enabled?: boolean;
      enabled?: boolean;
      phase?: string;
    }) => {
      const flagId = id ?? key ?? "";
      return api.put(`/api/platform/feature-flags/${flagId}`, data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.flags() }),
  });
}

export function useSetFlagOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      flagId,
      tenantId,
      enabled,
    }: {
      flagId: string;
      tenantId: string;
      enabled: boolean;
    }) =>
      api.put(`/api/platform/feature-flags/${flagId}/override`, {
        tenantId,
        enabled,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.flags() }),
  });
}

export function useRemoveFlagOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      flagId,
      tenantId,
    }: {
      flagId: string;
      tenantId: string;
    }) =>
      api.delete(
        `/api/platform/feature-flags/${flagId}/override/${tenantId}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.flags() }),
  });
}

// ─── MODULE 5: Platform Config ───────────────────────────────────────────────

export function usePlatformConfig() {
  return useQuery({
    queryKey: queryKeys.platform.config(),
    queryFn: () => api.get<PlatformConfig>("/api/platform/config"),
    staleTime: 60_000,
  });
}

export function usePlatformConfigSection(section: string) {
  return useQuery({
    queryKey: queryKeys.platform.configSection(section),
    queryFn: () =>
      api.get<Record<string, unknown>>(`/api/platform/config/${section}`),
    enabled: !!section,
    staleTime: 60_000,
  });
}

export function useUpdatePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      key,
      value,
    }: {
      section: string;
      key: string;
      value: unknown;
    }) => api.put(`/api/platform/config/${section}/${key}`, { value }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.config() }),
  });
}

// ─── MODULE 6: Audit Log ─────────────────────────────────────────────────────

export function usePlatformAuditLog(params?: {
  tenantId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.tenantId) searchParams.set("tenantId", params.tenantId);
  if (params?.actorId) searchParams.set("actorId", params.actorId);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.platform.auditLogs(
      params as Record<string, string> | undefined,
    ),
    queryFn: () =>
      api.get<AuditLogResponse>(
        `/api/platform/audit-log${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

// ─── MODULE 7: Announcements ─────────────────────────────────────────────────

export function usePlatformAnnouncements() {
  return useQuery({
    queryKey: queryKeys.platform.announcements(),
    queryFn: () => api.get<Announcement[]>("/api/platform/announcements"),
    staleTime: 30_000,
  });
}

export function useCreatePlatformAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      body: string;
      type?: "info" | "warning" | "critical";
      target?: "all" | "admins";
      active?: boolean;
      expires_at?: string;
    }) => api.post<Announcement>("/api/platform/announcements", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.announcements() }),
  });
}

export function useUpdatePlatformAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      body?: string;
      type?: "info" | "warning" | "critical";
      target?: "all" | "admins";
      active?: boolean;
      expires_at?: string | null;
    }) => api.patch<Announcement>(`/api/platform/announcements/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.announcements() }),
  });
}

export function useDeletePlatformAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/platform/announcements/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.announcements() }),
  });
}

// ─── MODULE 8: Email Templates ───────────────────────────────────────────────

export function usePlatformEmailTemplates() {
  return useQuery({
    queryKey: queryKeys.platform.emailTemplates(),
    queryFn: () => api.get<EmailTemplate[]>("/api/platform/email-templates"),
    staleTime: 60_000,
  });
}

export function useUpsertPlatformEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      ...data
    }: {
      key: string;
      subject: string;
      body_html: string;
      body_text?: string;
      variables?: Array<{ name: string; description: string }>;
    }) => api.put(`/api/platform/email-templates/${key}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.emailTemplates() }),
  });
}

// ─── MODULE 9: API Keys ─────────────────────────────────────────────────────

export function usePlatformApiKeys() {
  return useQuery({
    queryKey: queryKeys.platform.apiKeys(),
    queryFn: () => api.get<ApiKey[]>("/api/platform/api-keys"),
    staleTime: 30_000,
  });
}

export function useCreatePlatformApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      tenant_id?: string;
      permissions?: string[];
      expires_at?: string;
    }) => api.post<ApiKeyCreateResponse>("/api/platform/api-keys", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.apiKeys() }),
  });
}

export function useRevokePlatformApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/platform/api-keys/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.apiKeys() }),
  });
}

// ─── MODULE 10: Health ───────────────────────────────────────────────────────

export function usePlatformHealth() {
  return useQuery({
    queryKey: queryKeys.platform.health(),
    queryFn: () => api.get<HealthStatus>("/api/platform/health"),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

// ─── MODULE 11: Analytics ────────────────────────────────────────────────────

export function usePlatformAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.platform.analyticsOverview(),
    queryFn: () =>
      api.get<AnalyticsOverview>("/api/platform/analytics/overview"),
    staleTime: 30_000,
  });
}

export function usePlatformTenantGrowth(days = 30) {
  return useQuery({
    queryKey: queryKeys.platform.analyticsTenants(days),
    queryFn: () =>
      api.get<TenantGrowthPoint[]>(
        `/api/platform/analytics/tenants?days=${days}`,
      ),
    staleTime: 60_000,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platform.analyticsOverview(),
    queryFn: () => api.get<PlatformStats>("/api/platform/analytics/stats"),
    staleTime: 30_000,
  });
}

export function usePlatformLogs(params?: {
  tenantId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.tenantId) searchParams.set("tenantId", params.tenantId);
  if (params?.actorId) searchParams.set("actorId", params.actorId);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.platform.auditLogs(
      params as Record<string, string> | undefined,
    ),
    queryFn: () =>
      api.get<PlatformLogEntry[]>(
        `/api/platform/logs${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

// ─── MODULE 12: Data ─────────────────────────────────────────────────────────

export function useSeedFeatureFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/platform/data/seed-flags"),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.platform.flags() }),
  });
}
