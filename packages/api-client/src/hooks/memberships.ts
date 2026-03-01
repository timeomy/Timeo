import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Membership {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: "monthly" | "yearly";
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useMemberships(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.memberships.all(tenantId ?? ""),
    queryFn: () =>
      api.get<Membership[]>(`/api/tenants/${tenantId}/memberships`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useMembership(
  tenantId: string | null | undefined,
  membershipId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.memberships.byId(tenantId ?? "", membershipId ?? ""),
    queryFn: () =>
      api.get<Membership>(
        `/api/tenants/${tenantId}/memberships/${membershipId}`,
      ),
    enabled: !!tenantId && !!membershipId,
  });
}

export function useCreateMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      billingInterval: "monthly" | "yearly";
      description?: string;
      benefits?: string[];
    }) =>
      api.post<{ membershipId: string }>(
        `/api/tenants/${tenantId}/memberships`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useUpdateMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      ...data
    }: {
      membershipId: string;
      name?: string;
      price?: number;
      description?: string;
      benefits?: string[];
      isActive?: boolean;
    }) =>
      api.patch(
        `/api/tenants/${tenantId}/memberships/${membershipId}`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useDeleteMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      api.delete(`/api/tenants/${tenantId}/memberships/${membershipId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useSubscribeToMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      api.post<{ subscriptionId: string }>(
        `/api/tenants/${tenantId}/memberships/${membershipId}/subscribe`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}
