import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  plan?: string;
  status?: string;
  paymentGateway?: string;
  settings?: Record<string, unknown>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    logoUrl?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

type TimeoRole = "platform_admin" | "admin" | "staff" | "customer";

interface TenantWithRole extends Tenant {
  role: TimeoRole;
}

export function useMyTenants() {
  return useQuery({
    queryKey: queryKeys.tenants.mine(),
    queryFn: () => api.get<TenantWithRole[]>("/api/tenants/mine"),
    staleTime: 60_000,
  });
}

export function useTenant(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.byId(tenantId ?? ""),
    queryFn: () => api.get<Tenant>(`/api/tenants/${tenantId}`),
    enabled: !!tenantId,
  });
}

export function useTenantBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.bySlug(slug ?? ""),
    queryFn: () => api.get<Tenant>(`/api/tenants/slug/${slug}`),
    enabled: !!slug,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      industry?: string;
      currency?: string;
      timezone?: string;
    }) => api.post<{ tenantId: string }>("/api/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.mine() });
    },
  });
}

export function useUpdateTenantSettings(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/api/tenants/${tenantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.byId(tenantId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.mine() });
    },
  });
}

export function useUpdateTenantBranding(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      logo?: string;
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      branding?: Record<string, unknown>;
    }) => api.patch(`/api/tenants/${tenantId}/branding`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.byId(tenantId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.mine() });
    },
  });
}

export function useInviteStaff(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string; name?: string }) =>
      api.post(`/api/tenants/${tenantId}/staff/invite`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      }),
  });
}
