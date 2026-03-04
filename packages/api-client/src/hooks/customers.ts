import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  bookingCount: number;
  totalSpend: number;
  lastVisit: string | null;
  notes: string | null;
  tags: string[];
}

interface CustomerDetail extends CustomerSummary {
  avatarUrl: string | null;
  recentBookings: unknown[];
  recentOrders: unknown[];
  loyaltyBalance: {
    balance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    tier: string;
  } | null;
}

export function useCustomers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.all(tenantId ?? ""),
    queryFn: () =>
      api.get<CustomerSummary[]>(`/api/tenants/${tenantId}/customers`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCustomer(
  tenantId: string | null | undefined,
  customerId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.customers.byId(tenantId ?? "", customerId ?? ""),
    queryFn: () =>
      api.get<CustomerDetail>(
        `/api/tenants/${tenantId}/customers/${customerId}`,
      ),
    enabled: !!tenantId && !!customerId,
  });
}

export function useUpdateCustomer(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: {
      customerId: string;
      notes?: string;
      tags?: string[];
    }) =>
      api.patch(`/api/tenants/${tenantId}/customers/${customerId}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(tenantId),
      }),
  });
}
