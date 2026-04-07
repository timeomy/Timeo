import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

export type PaymentRequestStatus =
  | "pending_verification"
  | "approved"
  | "rejected";

export type PaymentRequestPlanType = "membership" | "session_package";

export interface PaymentRequest {
  id: string;
  customerId: string;
  planId?: string;
  planReferenceType: PaymentRequestPlanType;
  planName: string;
  planDurationMonths?: number;
  planSessionCount?: number;
  amount: number;
  currency: string;
  receiptUrl?: string;
  status: PaymentRequestStatus;
  memberNote?: string;
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  subscriptionId?: string;
  sessionCreditId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Member hooks ─────────────────────────────────────────────────────────────

export function useMyPaymentRequests(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.paymentRequests.mine(tenantId ?? ""),
    queryFn: () =>
      api.get<PaymentRequest[]>(
        `/api/tenants/${tenantId}/payment-requests/mine`,
      ),
    enabled: !!tenantId,
    staleTime: 15_000,
  });
}

export function useCreatePaymentRequest(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      planId: string;
      planReferenceType?: PaymentRequestPlanType;
      memberNote?: string;
      receiptUrl?: string;
    }) =>
      api.post<{ id: string; amount: number; planName: string }>(
        `/api/tenants/${tenantId}/payment-requests`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentRequests.mine(tenantId),
      });
    },
  });
}

export function useUploadPaymentReceipt(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      receiptUrl,
    }: {
      requestId: string;
      receiptUrl: string;
    }) =>
      api.patch<{ receiptUrl: string }>(
        `/api/tenants/${tenantId}/payment-requests/${requestId}/receipt`,
        { receiptUrl },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentRequests.mine(tenantId),
      });
    },
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

export function usePaymentRequests(
  tenantId: string | null | undefined,
  status?: PaymentRequestStatus,
) {
  return useQuery({
    queryKey: queryKeys.paymentRequests.all(tenantId ?? "", status),
    queryFn: () =>
      api.get<PaymentRequest[]>(
        `/api/tenants/${tenantId}/payment-requests${status ? `?status=${status}` : ""}`,
      ),
    enabled: !!tenantId,
    staleTime: 10_000,
    refetchInterval: 30_000, // Poll every 30s for new requests
  });
}

export function useApprovePaymentRequest(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      adminNote,
    }: {
      requestId: string;
      adminNote?: string;
    }) =>
      api.post<{
        message: string;
        subscriptionId?: string;
        sessionCreditId?: string;
      }>(
        `/api/tenants/${tenantId}/payment-requests/${requestId}/approve`,
        { adminNote },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentRequests.all(tenantId),
      });
      queryClient.invalidateQueries({ queryKey: ["gym", tenantId] });
    },
  });
}

export function useRejectPaymentRequest(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      adminNote,
    }: {
      requestId: string;
      adminNote: string;
    }) =>
      api.post<{ message: string }>(
        `/api/tenants/${tenantId}/payment-requests/${requestId}/reject`,
        { adminNote },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentRequests.all(tenantId),
      });
    },
  });
}
