import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName?: string;
  /** Snapshot of product name at time of order */
  snapshotName?: string;
  /** Snapshot of product price at time of order */
  snapshotPrice?: number;
}

interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  items: OrderItem[];
  totalAmount: number;
  /** Alias for totalAmount (convenience) */
  total?: number;
  currency: string;
  status:
    | "pending"
    | "awaiting_payment"
    | "confirmed"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled";
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Flat denormalized fields from the API JOIN
  customerName?: string;
  itemCount?: number;
}

export function useOrders(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.all(tenantId ?? ""),
    queryFn: () => api.get<Order[]>(`/api/tenants/${tenantId}/orders`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useOrder(
  tenantId: string | null | undefined,
  orderId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.orders.byId(tenantId ?? "", orderId ?? ""),
    queryFn: () =>
      api.get<Order>(`/api/tenants/${tenantId}/orders/${orderId}`),
    enabled: !!tenantId && !!orderId,
  });
}

export function useCreateOrder(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: { productId: string; quantity: number }[];
      customerId?: string;
      notes?: string;
    }) => api.post<{ orderId: string }>(`/api/tenants/${tenantId}/orders`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      }),
  });
}

export function useUpdateOrderStatus(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => api.patch(`/api/tenants/${tenantId}/orders/${orderId}`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      }),
  });
}
