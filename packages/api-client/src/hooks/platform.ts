import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  revenue: number;
}

interface PlatformConfig {
  maintenanceMode: boolean;
  signupEnabled: boolean;
  maxTenantsPerUser: number;
  defaultCurrency: string;
  defaultTimezone: string;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  tenantId?: string;
  details: Record<string, unknown>;
  createdAt: string;
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
    queryKey: queryKeys.platform.config(),
    queryFn: () => api.get<PlatformConfig>("/api/platform/config"),
    staleTime: 60_000,
  });
}

export function usePlatformFlags() {
  return useQuery({
    queryKey: queryKeys.platform.flags(),
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
      api.put("/api/platform/flags", data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.flags(),
      }),
  });
}

export function useUpdatePlatformConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlatformConfig>) =>
      api.put("/api/platform/config", data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.config(),
      }),
  });
}
