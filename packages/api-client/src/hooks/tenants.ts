import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoUrl?: string;
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

type TimeoRole = "platform_admin" | "admin" | "staff" | "coach" | "customer";

interface TenantWithRole extends Tenant {
  role: TimeoRole;
}

interface MyTenantsResponse {
  tenants: TenantWithRole[];
  platformRole: "platform_admin" | "user";
}

interface UseMyTenantsOptions {
  enabled?: boolean;
  userId?: string | null;
}

export function useMyTenants(options?: UseMyTenantsOptions) {
  const isEnabled = options?.enabled ?? true;

  const query = useQuery({
    queryKey: queryKeys.tenants.mine(options?.userId),
    queryFn: () => api.get<MyTenantsResponse>("/api/tenants/mine"),
    staleTime: 60_000,
    enabled: isEnabled,
  });

  return {
    ...query,
    /** Flat tenant list (backwards-compatible) */
    tenants: query.data?.tenants ?? [],
    /** Platform-level role from users table */
    platformRole: query.data?.platformRole,
  };
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
    queryFn: () => api.get<Tenant>(`/api/tenants/by-slug/${slug}`),
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
      logoUrl?: string | null;
      primaryColor?: string;
      secondaryColor?: string;
      companyDisplayName?: string;
      currency?: string;
      [key: string]: unknown;
    }) => api.patch(`/api/tenants/${tenantId}/branding`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.byId(tenantId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.mine() });
    },
  });
}

export function useTenantFeatureFlags(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.featureFlags(tenantId ?? ""),
    queryFn: async () => {
      const response = await api.get<
        | Record<string, boolean>
        | {
            flags?: Record<string, boolean>;
            details?: Array<{ key: string; enabled: boolean }>;
          }
      >(`/api/tenants/${tenantId}/feature-flags`);

      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "flags" in response &&
        response.flags &&
        typeof response.flags === "object"
      ) {
        return response.flags;
      }

      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "details" in response &&
        Array.isArray(response.details)
      ) {
        return Object.fromEntries(
          response.details.map((item) => [item.key, item.enabled]),
        );
      }

      return response as Record<string, boolean>;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export function usePublicTenants(search?: string) {
  return useQuery({
    queryKey: queryKeys.tenants.public(search),
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      return api.get<PublicTenant[]>(`/api/tenants/public${params}`);
    },
    staleTime: 30_000,
  });
}

export function useJoinTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      api.post<{ tenantId: string; tenantName: string }>("/api/tenants/join", {
        slug,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
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
