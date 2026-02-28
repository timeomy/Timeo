import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface MemberQrCode {
  id: string;
  tenantId: string;
  userId: string;
  code: string;
  expiresAt?: string;
  createdAt: string;
}

export function useMemberQrCode(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.checkIns.qrCode(tenantId ?? ""),
    queryFn: () =>
      api.get<MemberQrCode>(`/api/tenants/${tenantId}/check-ins/qr-code`),
    enabled: !!tenantId,
  });
}

export function useGenerateQrCode(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_data?: { tenantId?: string }) =>
      api.post<{ qrCode: string; expiresAt: string }>(
        `/api/tenants/${tenantId}/check-ins/qr-code`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkIns.qrCode(tenantId),
      }),
  });
}
