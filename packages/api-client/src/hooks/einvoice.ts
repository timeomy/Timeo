import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

export type EInvoiceRequestStatus = "pending" | "submitted" | "rejected";

export interface EInvoiceRequest {
  id: string;
  tenantId: string;
  orderId?: string;
  transactionId?: string;
  invoiceNumber: string;
  receiptNumber: string;
  status: EInvoiceRequestStatus;
  buyerTin?: string;
  buyerIdType?: "nric" | "passport" | "brn" | "army";
  buyerIdValue?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  buyerSstRegNo?: string;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  submittedAt?: string;
  lhdnSubmissionId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EInvoiceProfile {
  taxpayerName: string;
  tin: string;
  msicCode?: string;
  msicDescription?: string;
  idType: "nric" | "passport" | "brn" | "army";
  idNumber: string;
  sstRegNo?: string;
  sstRate?: number;
  tourismRegNo?: string;
  address: {
    line1: string;
    line2?: string;
    line3?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  notificationEmail: string;
  notificationPhone: string;
  lhdnClientId?: string;
  lhdnClientSecret?: string;
}

export interface EInvoiceLookupResponse {
  found: boolean;
  receiptNumber: string;
  alreadySubmitted?: boolean;
  existingStatus?: EInvoiceRequestStatus;
  requestId?: string;
  transaction?: {
    id: string;
    receiptNumber: string;
    status: string;
    date: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    currency: string;
    paymentMethod: string;
  };
}

export function useEInvoiceRequests(
  tenantId: string | null | undefined,
  filters?: {
    status?: EInvoiceRequestStatus;
  },
) {
  const status = filters?.status;

  return useQuery({
    queryKey: [...queryKeys.einvoice.all(tenantId ?? ""), status],
    queryFn: () => {
      const params = status ? `?status=${status}` : "";
      return api.get<EInvoiceRequest[]>(`/api/tenants/${tenantId}/einvoice${params}`);
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useEInvoiceLookup(
  tenantId: string | null | undefined,
  receiptNumber: string | null | undefined,
) {
  return useQuery({
    queryKey: [...queryKeys.einvoice.all(tenantId ?? ""), "lookup", receiptNumber ?? ""],
    queryFn: () =>
      api.get<EInvoiceLookupResponse>(
        `/api/tenants/${tenantId}/einvoice/lookup?receiptNumber=${encodeURIComponent(receiptNumber ?? "")}`,
      ),
    enabled: !!tenantId && !!receiptNumber,
    staleTime: 10_000,
  });
}

export function useEInvoiceProfile(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.einvoice.all(tenantId ?? ""), "profile"],
    queryFn: () =>
      api.get<EInvoiceProfile | null>(`/api/tenants/${tenantId}/einvoice/profile`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useSaveEInvoiceProfile(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EInvoiceProfile) =>
      api.put<{ profileId: string }>(`/api/tenants/${tenantId}/einvoice/profile`, data),
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
      receiptNumber: string;
      buyerTin: string;
      buyerIdType: "nric" | "passport" | "brn" | "army";
      buyerIdValue: string;
      buyerName: string;
      buyerEmail: string;
      buyerPhone?: string;
      buyerAddress: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postcode: string;
        country?: string;
      };
      buyerSstRegNo?: string;
    }) =>
      api.post<{ id: string; alreadySubmitted: boolean; status: EInvoiceRequestStatus }>(
        `/api/tenants/${tenantId}/einvoice/public-request`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.einvoice.all(tenantId) });
    },
  });
}

export function useSubmitEInvoice(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { requestId: string; lhdnSubmissionId?: string }) =>
      api.post<{ message: string }>(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/submit`,
        { lhdnSubmissionId: data.lhdnSubmissionId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.einvoice.all(tenantId) });
    },
  });
}

export function useMarkEInvoiceSubmitted(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { requestId: string; lhdnSubmissionId?: string }) =>
      api.patch<{ message: string }>(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/submitted`,
        { lhdnSubmissionId: data.lhdnSubmissionId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.einvoice.all(tenantId) });
    },
  });
}

export function useMarkEInvoiceRejected(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { requestId: string; reason: string }) =>
      api.patch<{ message: string }>(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/rejected`,
        { reason: data.reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.einvoice.all(tenantId) });
    },
  });
}

export function useRevertEInvoiceToPending(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { requestId: string }) =>
      api.patch<{ message: string }>(
        `/api/tenants/${tenantId}/einvoice/${data.requestId}/pending`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.einvoice.all(tenantId) });
    },
  });
}

