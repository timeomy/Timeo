import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface PosTransactionItem {
  type: string;
  referenceId?: string;
  name: string;
  price: number;
  quantity: number;
}

interface PosTransaction {
  id: string;
  tenantId: string;
  orderId?: string;
  amount: number;
  total?: number;
  currency: string;
  paymentMethod: "cash" | "card" | "qr_pay" | "bank_transfer" | "ewallet";
  status: "completed" | "voided" | "pending";
  staffId: string;
  receiptNumber?: string;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  items?: PosTransactionItem[];
  createdAt: string;
  updatedAt: string;
}

export function usePosTransactions(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.pos.all(tenantId ?? ""),
    queryFn: () =>
      api.get<PosTransaction[]>(`/api/tenants/${tenantId}/pos`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function usePosTransaction(
  tenantId: string | null | undefined,
  transactionId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.pos.byId(tenantId ?? "", transactionId ?? ""),
    queryFn: () =>
      api.get<PosTransaction>(`/api/tenants/${tenantId}/pos/${transactionId}`),
    enabled: !!tenantId && !!transactionId,
  });
}

export function useCreatePosTransaction(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount?: number;
      paymentMethod: string;
      orderId?: string;
      notes?: string;
      customerEmail?: string;
      items?: PosTransactionItem[];
      discount?: number;
      voucherId?: string;
    }) =>
      api.post<{ transactionId: string; receiptNumber?: string }>(`/api/tenants/${tenantId}/pos`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.pos.all(tenantId),
      }),
  });
}

export function useDeletePosTransaction(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      api.delete(`/api/tenants/${tenantId}/pos/${transactionId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.pos.all(tenantId),
      }),
  });
}

interface DailySummary {
  date: string;
  totalAmount: number;
  totalRevenue: number;
  totalTransactions: number;
  totalDiscount: number;
  voidedCount: number;
  transactionCount: number;
  currency: string;
  byMethod: Record<string, number>;
}

export function useDailySummary(
  tenantId: string | null | undefined,
  date?: string,
) {
  return useQuery({
    queryKey: [...queryKeys.pos.all(tenantId ?? ""), "daily", date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return api.get<DailySummary>(
        `/api/tenants/${tenantId}/pos/daily-summary${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

interface MonthlyStatement {
  month: string;
  totalAmount: number;
  transactionCount: number;
  currency: string;
  days: DailySummary[];
}

export function useMonthlyStatement(
  tenantId: string | null | undefined,
  month?: string | { year: number; month: number },
) {
  const monthParam =
    typeof month === "object"
      ? `${month.year}-${String(month.month + 1).padStart(2, "0")}`
      : month;

  return useQuery({
    queryKey: [...queryKeys.pos.all(tenantId ?? ""), "monthly", monthParam],
    queryFn: () => {
      const params = monthParam ? `?month=${monthParam}` : "";
      return api.get<MonthlyStatement>(
        `/api/tenants/${tenantId}/pos/monthly-statement${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

interface VoucherValidation {
  valid: boolean;
  reason?: string;
  voucher?: {
    id: string;
    type: string;
    value: number;
    discountType?: string;
    discountValue?: number;
    minOrderAmount?: number;
  };
  voucherId?: string;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
}

export function useValidateVoucher(
  tenantId: string | null | undefined,
  params?: { code: string } | undefined,
) {
  return useQuery({
    queryKey: [...queryKeys.pos.all(tenantId ?? ""), "voucher-validate", params?.code],
    queryFn: () =>
      api.get<VoucherValidation>(
        `/api/tenants/${tenantId}/vouchers/validate?code=${encodeURIComponent(params!.code)}`,
      ),
    enabled: !!tenantId && !!params?.code,
    staleTime: 10_000,
  });
}

export function useVoidPosTransaction(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { transactionId: string; reason?: string }) =>
      api.patch(`/api/tenants/${tenantId}/pos/${data.transactionId}/void`, {
        reason: data.reason,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.pos.all(tenantId),
      }),
  });
}
