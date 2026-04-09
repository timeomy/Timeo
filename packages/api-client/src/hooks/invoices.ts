import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total?: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  userId?: string | null;
  invoiceNumber: string;
  amount: number;
  subtotal?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  currency: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  myinvoisId?: string | null;
  transactionId?: string | null;
  paymentMethod?: string | null;
  source?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  tenant?: {
    id: string;
    name?: string | null;
    slug?: string | null;
    eInvoiceProfile?: Record<string, unknown> | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  sourceType?: "payment_request" | "pos_transaction" | "manual";
  sourceId?: string;
  userId?: string;
  memberName?: string;
  memberEmail?: string;
  description?: string;
  amount?: number;
  taxRate?: number;
  currency?: string;
  status?: InvoiceStatus;
  paymentMethod?: string;
  notes?: string;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceItem[];
}

export function useInvoices(
  tenantId: string | null | undefined,
  filters?: {
    status?: InvoiceStatus;
    memberId?: string;
    search?: string;
    from?: string;
    to?: string;
  },
) {
  return useQuery({
    queryKey: queryKeys.invoices.all(tenantId ?? "", {
      status: filters?.status ?? "",
      memberId: filters?.memberId ?? "",
      search: filters?.search ?? "",
      from: filters?.from ?? "",
      to: filters?.to ?? "",
    }),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.memberId) params.set("memberId", filters.memberId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return api.get<Invoice[]>(`/api/tenants/${tenantId}/invoices${suffix}`);
    },
    enabled: !!tenantId,
    staleTime: 20_000,
  });
}

export function useMyInvoices(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.mine(tenantId ?? ""),
    queryFn: () => api.get<Invoice[]>(`/api/tenants/${tenantId}/invoices/mine`),
    enabled: !!tenantId,
    staleTime: 20_000,
  });
}

export function useInvoice(
  tenantId: string | null | undefined,
  invoiceId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.invoices.byId(tenantId ?? "", invoiceId ?? ""),
    queryFn: () => api.get<Invoice>(`/api/tenants/${tenantId}/invoices/${invoiceId}`),
    enabled: !!tenantId && !!invoiceId,
  });
}

export function useCreateInvoice(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      api.post<{ id: string; invoiceNumber: string; status: InvoiceStatus }>(
        `/api/tenants/${tenantId}/invoices`,
        payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.mine(tenantId) });
    },
  });
}

export function useUpdateInvoice(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      invoiceId: string;
      status?: InvoiceStatus;
      notes?: string;
      dueDate?: string | null;
      myinvoisId?: string | null;
    }) => {
      const { invoiceId, ...body } = input;
      return api.patch<{ message: string }>(
        `/api/tenants/${tenantId}/invoices/${invoiceId}`,
        body,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.mine(tenantId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byId(tenantId, variables.invoiceId),
      });
    },
  });
}

export function useEmailInvoice(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      api.post<{ message: string }>(`/api/tenants/${tenantId}/invoices/${invoiceId}/email`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.mine(tenantId) });
    },
  });
}

