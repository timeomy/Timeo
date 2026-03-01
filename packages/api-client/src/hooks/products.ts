import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  sku?: string;
  stockQuantity?: number;
  categoryId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useProducts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.all(tenantId ?? ""),
    queryFn: () => api.get<Product[]>(`/api/tenants/${tenantId}/products`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useProduct(
  tenantId: string | null | undefined,
  productId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.products.byId(tenantId ?? "", productId ?? ""),
    queryFn: () =>
      api.get<Product>(`/api/tenants/${tenantId}/products/${productId}`),
    enabled: !!tenantId && !!productId,
  });
}

export function useCreateProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      description?: string;
      sku?: string;
      stockQuantity?: number;
      categoryId?: string;
      imageUrl?: string;
    }) => api.post<{ productId: string }>(`/api/tenants/${tenantId}/products`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.all(tenantId),
      }),
  });
}

export function useUpdateProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      productId,
      ...data
    }: {
      id?: string;
      productId?: string;
      name?: string;
      price?: number;
      description?: string;
      sku?: string;
      stockQuantity?: number;
      categoryId?: string;
      imageUrl?: string;
      isActive?: boolean;
    }) => api.patch(`/api/tenants/${tenantId}/products/${id ?? productId}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.all(tenantId),
      }),
  });
}

export function useDeleteProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/api/tenants/${tenantId}/products/${productId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.all(tenantId),
      }),
  });
}
