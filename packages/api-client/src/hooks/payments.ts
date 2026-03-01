import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Payment {
  id: string;
  tenantId: string;
  orderId?: string;
  bookingId?: string;
  amount: number;
  currency: string;
  provider: "stripe" | "revenue_monster";
  method?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export function usePayments(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.all(tenantId ?? ""),
    queryFn: () => api.get<Payment[]>(`/api/tenants/${tenantId}/payments`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function usePayment(
  tenantId: string | null | undefined,
  paymentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.payments.byId(tenantId ?? "", paymentId ?? ""),
    queryFn: () =>
      api.get<Payment>(`/api/tenants/${tenantId}/payments/${paymentId}`),
    enabled: !!tenantId && !!paymentId,
  });
}

export function useCreateStripePayment(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      currency?: string;
      orderId?: string;
      bookingId?: string;
      customerId?: string;
      returnUrl?: string;
    }) =>
      api.post<{ paymentId: string; clientSecret: string }>(
        `/api/tenants/${tenantId}/payments`,
        { ...data, provider: "stripe" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.all(tenantId),
      }),
  });
}

export function useCreateRevenueMonsterPayment(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      orderId?: string;
      bookingId?: string;
      method?: string;
      redirectUrl?: string;
    }) =>
      api.post<{ paymentId: string; checkoutUrl: string }>(
        `/api/tenants/${tenantId}/payments`,
        { ...data, provider: "revenue_monster" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.all(tenantId),
      }),
  });
}
