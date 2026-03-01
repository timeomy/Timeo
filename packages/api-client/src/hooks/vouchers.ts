import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Voucher {
  id: string;
  tenantId: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Extended fields used by dashboard vouchers page
  type?: string;
  value?: number;
  source?: string;
  partnerName?: string;
  description?: string;
  // Additional convenience fields that may appear in API responses
  voucherCode?: string;
  voucherType?: string;
  voucherValue?: number;
  discountAmount?: number;
  redeemedAt?: string;
}

export function useVouchers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.vouchers.all(tenantId ?? ""),
    queryFn: () => api.get<Voucher[]>(`/api/tenants/${tenantId}/vouchers`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useVoucher(
  tenantId: string | null | undefined,
  voucherId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.vouchers.byId(tenantId ?? "", voucherId ?? ""),
    queryFn: () =>
      api.get<Voucher>(`/api/tenants/${tenantId}/vouchers/${voucherId}`),
    enabled: !!tenantId && !!voucherId,
  });
}

export function useCreateVoucher(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      code: string;
      type?: string;
      value?: number;
      discountType?: "percentage" | "fixed";
      discountValue?: number;
      minOrderAmount?: number;
      maxUses?: number;
      expiresAt?: string;
      source?: string;
      partnerName?: string;
      description?: string;
    }) =>
      api.post<{ voucherId: string }>(
        `/api/tenants/${tenantId}/vouchers`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vouchers.all(tenantId),
      }),
  });
}

export function useUpdateVoucher(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      voucherId,
      ...data
    }: {
      voucherId: string;
      value?: number;
      discountValue?: number;
      minOrderAmount?: number;
      maxUses?: number;
      expiresAt?: string;
      isActive?: boolean;
      source?: string;
      partnerName?: string;
      description?: string;
    }) => api.patch(`/api/tenants/${tenantId}/vouchers/${voucherId}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vouchers.all(tenantId),
      }),
  });
}

export function useDeleteVoucher(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voucherId: string) =>
      api.delete(`/api/tenants/${tenantId}/vouchers/${voucherId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vouchers.all(tenantId),
      }),
  });
}

export function useToggleVoucher(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voucherId: string) =>
      api.patch(`/api/tenants/${tenantId}/vouchers/${voucherId}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vouchers.all(tenantId),
      }),
  });
}

export function useRedeemVoucher(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      voucherId,
      orderId,
    }: {
      voucherId: string;
      orderId: string;
    }) =>
      api.post<{ discount: number }>(
        `/api/tenants/${tenantId}/vouchers/${voucherId}/redeem`,
        { orderId },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vouchers.all(tenantId),
      }),
  });
}
