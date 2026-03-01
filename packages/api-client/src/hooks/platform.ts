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
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  mrr: number;
  revenue: number;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  signupEnabled: boolean;
  maxTenantsPerUser: number;
  defaultCurrency: string;
  defaultTimezone: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  actorEmail: string;
  actorRole: string;
  tenantId?: string;
  targetName: string;
  targetId: string;
  ipAddress: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants30d: number;
  mrr: number;
  arr: number;
  newTenants30d: number;
  churnRate30d: number;
  avgRevenuePerTenant: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  amountCents: number;
  status: string;
  startDate: string;
  nextRenewal: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

// Extends the shared queryKeys.platform for finer-grained keys
const platformKeys = {
  stats: () => ["platform", "stats"] as const,
  health: () => ["platform", "health"] as const,
  tenants: (params?: Record<string, string>) =>
    params
      ? (["platform", "tenants", "list", params] as const)
      : (["platform", "tenants"] as const),
  tenant: (id: string) => ["platform", "tenants", id] as const,
  users: (params?: Record<string, string>) =>
    params
      ? (["platform", "users", "list", params] as const)
      : (["platform", "users"] as const),
  user: (id: string) => ["platform", "users", id] as const,
  subscriptions: (params?: Record<string, string>) =>
    ["platform", "subscriptions", params ?? {}] as const,
  analytics: (range: string) => ["platform", "analytics", range] as const,
  auditLogs: (params?: Record<string, string>) =>
    ["platform", "audit-logs", params ?? {}] as const,
  flags: () => queryKeys.platform.flags(),
  flag: (key: string) => ["platform", "flags", key] as const,
  config: () => queryKeys.platform.config(),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePlatformStats() {
  return useQuery({
    queryKey: platformKeys.stats(),
    queryFn: () => api.get<PlatformStats>("/api/platform/stats"),
    staleTime: 30_000,
  });
}

export function usePlatformTenants() {
  return useQuery({
    queryKey: queryKeys.platform.tenants(),
    queryFn: () => api.get<PlatformTenant[]>("/api/platform/tenants"),
    staleTime: 30_000,
  });
}

export function usePlatformConfig() {
  return useQuery({
    queryKey: platformKeys.config(),
    queryFn: () => api.get<PlatformConfig>("/api/platform/config"),
    staleTime: 60_000,
  });
}

export function usePlatformFlags() {
  return useQuery({
    queryKey: platformKeys.flags(),
    queryFn: () => api.get<FeatureFlag[]>("/api/platform/flags"),
    staleTime: 30_000,
  });
}

export function usePlatformLogs() {
  return useQuery({
    queryKey: queryKeys.platform.logs(),
    queryFn: () => api.get<AuditLog[]>("/api/platform/logs"),
    staleTime: 15_000,
  });
}

export function useUpdatePlatformFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; enabled: boolean }) =>
      api.patch(`/api/platform/flags/${encodeURIComponent(data.key)}`, {
        enabled: data.enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.flags() });
    },
  });
}

export function useUpdatePlatformConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlatformConfig>) =>
      api.put("/api/platform/config", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.config() }),
  });
}

export function useCreatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      ownerEmail: string;
      plan: string;
      country?: string;
      currency?: string;
    }) => api.post<PlatformTenant>("/api/platform/tenants", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() }),
  });
}

export function useUpdatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      api.patch(`/api/platform/tenants/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useDeletePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/platform/tenants/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() }),
  });
}

export function useSuspendPlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/platform/tenants/${id}/suspend`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ token: string; url: string }>(
        `/api/platform/tenants/${id}/impersonate`,
      ),
  });
}

export function usePlatformUsers() {
  return useQuery({
    queryKey: platformKeys.users(),
    queryFn: () => api.get<PlatformUser[]>("/api/platform/users"),
    staleTime: 30_000,
  });
}

export function usePlatformSubscriptions() {
  return useQuery({
    queryKey: platformKeys.subscriptions(),
    queryFn: () =>
      api.get<{ items: PlatformSubscription[]; total: number }>(
        "/api/platform/subscriptions",
      ),
    staleTime: 30_000,
  });
}

export function useUpdatePlatformSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.patch(`/api/platform/subscriptions/${id}`, { plan }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.subscriptions(),
      }),
  });
}

export function useCancelPlatformSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/platform/subscriptions/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.subscriptions(),
      }),
  });
}
