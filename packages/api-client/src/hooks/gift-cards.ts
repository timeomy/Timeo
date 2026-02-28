import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  purchasedBy?: string;
  purchaserName?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  status?: "active" | "cancelled" | "expired" | "fully_used";
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useGiftCards(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.giftCards.all(tenantId ?? ""),
    queryFn: () => api.get<GiftCard[]>(`/api/tenants/${tenantId}/gift-cards`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useGiftCard(
  tenantId: string | null | undefined,
  giftCardId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.giftCards.byId(tenantId ?? "", giftCardId ?? ""),
    queryFn: () =>
      api.get<GiftCard>(
        `/api/tenants/${tenantId}/gift-cards/${giftCardId}`,
      ),
    enabled: !!tenantId && !!giftCardId,
  });
}

export function useGiftCardByCode(
  tenantId: string | null | undefined,
  code: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.giftCards.byCode(tenantId ?? "", code ?? ""),
    queryFn: () =>
      api.get<GiftCard>(`/api/tenants/${tenantId}/gift-cards/code/${code}`),
    enabled: !!tenantId && !!code,
  });
}

export function useCreateGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      initialBalance: number;
      recipientEmail?: string;
      recipientName?: string;
      purchaserName?: string;
      message?: string;
      expiresAt?: string;
    }) =>
      api.post<{ giftCardId: string; code: string }>(
        `/api/tenants/${tenantId}/gift-cards`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}

export function useTopupGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      giftCardId,
      amount,
    }: {
      giftCardId: string;
      amount: number;
    }) =>
      api.post<{ newBalance: number }>(
        `/api/tenants/${tenantId}/gift-cards/${giftCardId}/topup`,
        { amount },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}

export function useCancelGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (giftCardId: string) =>
      api.patch(`/api/tenants/${tenantId}/gift-cards/${giftCardId}/cancel`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}

export function useReactivateGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (giftCardId: string) =>
      api.patch(`/api/tenants/${tenantId}/gift-cards/${giftCardId}/reactivate`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}

export function useDeleteGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (giftCardId: string) =>
      api.delete(`/api/tenants/${tenantId}/gift-cards/${giftCardId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}

export function useRedeemGiftCard(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      giftCardId,
      amount,
      orderId,
    }: {
      giftCardId: string;
      amount: number;
      orderId?: string;
    }) =>
      api.post<{ remainingBalance: number }>(
        `/api/tenants/${tenantId}/gift-cards/${giftCardId}/redeem`,
        { amount, orderId },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftCards.all(tenantId),
      }),
  });
}
