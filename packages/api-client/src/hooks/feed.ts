import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface Broadcast {
  id: string;
  tenantId: string;
  title?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  type: "promotion" | "announcement" | "event" | "new_service";
  isActive: boolean;
  startsAt: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  tenantName?: string;
  tenantLogo?: string;
}

export interface ServiceCatalogItem {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DiscoverFeed {
  broadcasts: Broadcast[];
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    coverUrl?: string;
  }>;
}

// ─── Query keys ───────────────────────────────────────────────────────────────
const broadcastKeys = {
  explore: () => ["broadcasts", "explore"] as const,
  discover: () => ["feed", "discover"] as const,
  byTenant: (tenantId: string) => ["broadcasts", tenantId] as const,
  adminByTenant: (tenantId: string) => ["broadcasts", tenantId, "admin"] as const,
};

const catalogKeys = {
  byTenant: (tenantId: string) => ["catalog", tenantId] as const,
};

// ─── Public explore feed ─────────────────────────────────────────────────────
export function useFeedBroadcasts() {
  return useQuery({
    queryKey: broadcastKeys.explore(),
    queryFn: () => api.get<Broadcast[]>("/api/feed/broadcasts"),
    staleTime: 60_000,
  });
}

export function useDiscoverFeed() {
  return useQuery({
    queryKey: broadcastKeys.discover(),
    queryFn: () => api.get<DiscoverFeed>("/api/feed/discover"),
    staleTime: 60_000,
  });
}

// ─── Tenant broadcasts (member view) ─────────────────────────────────────────
export function useTenantBroadcasts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: broadcastKeys.byTenant(tenantId ?? ""),
    queryFn: () => api.get<Broadcast[]>(`/api/tenants/${tenantId}/broadcasts`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

// ─── Admin broadcast management ──────────────────────────────────────────────
export function useAdminBroadcasts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: broadcastKeys.adminByTenant(tenantId ?? ""),
    queryFn: () => api.get<Broadcast[]>(`/api/tenants/${tenantId}/broadcasts/admin`),
    enabled: !!tenantId,
    staleTime: 10_000,
  });
}

export function useCreateBroadcast(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      content?: string;
      imageUrl?: string;
      linkUrl?: string;
      type?: "promotion" | "announcement" | "event" | "new_service";
      isActive?: boolean;
      expiresAt?: string | null;
    }) => api.post<{ id: string }>(`/api/tenants/${tenantId}/broadcasts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.adminByTenant(tenantId) });
      queryClient.invalidateQueries({ queryKey: broadcastKeys.byTenant(tenantId) });
    },
  });
}

export function useToggleBroadcast(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/tenants/${tenantId}/broadcasts/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.adminByTenant(tenantId) });
      queryClient.invalidateQueries({ queryKey: broadcastKeys.byTenant(tenantId) });
    },
  });
}

export function useDeleteBroadcast(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (broadcastId: string) =>
      api.delete(`/api/tenants/${tenantId}/broadcasts/${broadcastId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.adminByTenant(tenantId) });
      queryClient.invalidateQueries({ queryKey: broadcastKeys.byTenant(tenantId) });
    },
  });
}

// ─── Service Catalog ─────────────────────────────────────────────────────────
export function useServiceCatalog(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: catalogKeys.byTenant(tenantId ?? ""),
    queryFn: () => api.get<ServiceCatalogItem[]>(`/api/tenants/${tenantId}/catalog`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
