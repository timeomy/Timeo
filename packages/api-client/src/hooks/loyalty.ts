import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface LoyaltyBalance {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  tier: string;
}

interface LoyaltyTransaction {
  id: string;
  tenantId: string;
  userId: string;
  type: "earned" | "redeemed" | "expired" | "adjusted";
  points: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export function useLoyaltyBalance(
  tenantId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.loyalty.balance(tenantId ?? "", userId ?? ""),
    queryFn: () =>
      api.get<LoyaltyBalance>(
        `/api/tenants/${tenantId}/loyalty/balance/${userId}`,
      ),
    enabled: !!tenantId && !!userId,
    staleTime: 30_000,
  });
}

export function useLoyaltyHistory(
  tenantId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.loyalty.history(tenantId ?? "", userId ?? ""),
    queryFn: () =>
      api.get<LoyaltyTransaction[]>(
        `/api/tenants/${tenantId}/loyalty/history/${userId}`,
      ),
    enabled: !!tenantId && !!userId,
    staleTime: 30_000,
  });
}

export function useEarnPoints(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; points: number; note?: string }) =>
      api.post<LoyaltyBalance>(
        `/api/tenants/${tenantId}/loyalty/earn`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.loyalty.all(tenantId),
      }),
  });
}

export function useRedeemPoints(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { points: number; orderId?: string }) =>
      api.post<{ success: boolean; pointsRedeemed: number; valueRedeemed: number }>(
        `/api/tenants/${tenantId}/loyalty/redeem`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.loyalty.all(tenantId),
      }),
  });
}
