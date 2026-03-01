import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface EInvoiceRequest {
  id: string;
  tenantId: string;
  orderId?: string;
  invoiceNumber: string;
  receiptNumber?: string;
  status: "draft" | "pending" | "submitted" | "accepted" | "rejected";
  buyerTin?: string;
  buyerName?: string;
  buyerEmail?: string;
  totalAmount: number;
  currency: string;
  submittedAt?: string;
  lhdnSubmissionId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface EInvoiceProfile {
  id?: string;
  tenantId: string;
  taxpayerName?: string;
  tin?: string;
  msicCode?: string;
  msicDescription?: string;
  idType?: string;
  idNumber?: string;
  sstRegNo?: string;
  tourismRegNo?: string;
  address?: {
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  notificationEmail?: string;
  notificationPhone?: string;
  lhdnClientId?: string;
  lhdnClientSecret?: string;
}

export function useEInvoiceRequests(
  tenantId: string | null | undefined,
  filters?: {
    status?: "pending" | "submitted" | "rejected" | "accepted" | "draft";
  },
) {
  const status = filters?.status;
  return useQuery({
    queryKey: [...queryKeys.einvoice.all(tenantId ?? ""), status],
    queryFn: () => {
      const params = status ? `?status=${status}` : "";
      return api.get<EInvoiceRequest[]>(
        `/api/tenants/${tenantId}/einvoice${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useEInvoiceProfile(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.einvoice.all(tenantId ?? ""), "profile"],
    queryFn: () =>
      api.get<EInvoiceProfile>(`/api/tenants/${tenantId}/einvoice/profile`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useSaveEInvoiceProfile(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EInvoiceProfile, "id" | "tenantId">) =>
      api.put<{ profileId: string }>(
        `/api/tenants/${tenantId}/einvoice/profile`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}

export function useCreateEInvoiceRequest(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orderId?: string;
      buyerTin?: string;
      buyerName?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    }) =>
      api.post<{ einvoiceId: string }>(
        `/api/tenants/${tenantId}/einvoice`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}

export function useSubmitEInvoice(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (einvoiceId: string) =>
      api.post(`/api/tenants/${tenantId}/einvoice/${einvoiceId}/submit`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}

export function useMarkEInvoiceSubmitted(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestId: string; lhdnSubmissionId?: string }) =>
      api.patch(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/submitted`,
        { lhdnSubmissionId: data.lhdnSubmissionId },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}

export function useMarkEInvoiceRejected(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestId: string; reason: string }) =>
      api.patch(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/rejected`,
        { reason: data.reason },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}

export function useRevertEInvoiceToPending(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestId: string }) =>
      api.patch(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/pending`,
        {},
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.einvoice.all(tenantId),
      }),
  });
}
