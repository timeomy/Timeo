import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Service {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** Duration in minutes (mapped from DB `duration_minutes` via toCamel) */
  durationMinutes: number;
  price: number;
  currency: string;
  imageUrl?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useServices(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.services.all(tenantId ?? ""),
    queryFn: () => api.get<Service[]>(`/api/tenants/${tenantId}/services`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useService(
  tenantId: string | null | undefined,
  serviceId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.services.byId(tenantId ?? "", serviceId ?? ""),
    queryFn: () =>
      api.get<Service>(`/api/tenants/${tenantId}/services/${serviceId}`),
    enabled: !!tenantId && !!serviceId,
  });
}

export function useCreateService(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      durationMinutes: number;
      price: number;
      description?: string;
      currency?: string;
      imageUrl?: string;
      categoryId?: string;
    }) => api.post<{ id: string }>(`/api/tenants/${tenantId}/services`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.all(tenantId),
      }),
  });
}

export function useUpdateService(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      serviceId,
      ...data
    }: {
      id?: string;
      serviceId?: string;
      name?: string;
      durationMinutes?: number;
      price?: number;
      description?: string;
      currency?: string;
      imageUrl?: string;
      categoryId?: string;
      isActive?: boolean;
    }) => api.patch(`/api/tenants/${tenantId}/services/${id ?? serviceId}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.all(tenantId),
      }),
  });
}

export function useDeleteService(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api.delete(`/api/tenants/${tenantId}/services/${serviceId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.all(tenantId),
      }),
  });
}
