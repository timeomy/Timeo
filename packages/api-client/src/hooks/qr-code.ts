import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

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

interface FaceEnrollmentStatus {
  enrolled: boolean;
  enrolledAt?: string;
  photoUrl?: string;
}

export function useFaceEnrollmentStatus(
  tenantId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.checkIns.faceEnrollment(tenantId ?? ""),
    queryFn: () =>
      api.get<FaceEnrollmentStatus>(
        `/api/tenants/${tenantId}/gym/face-enrollment/status`,
      ),
    enabled: !!tenantId,
  });
}

export function useSubmitFacePhoto(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { photoBase64: string }) =>
      api.post<{ enrolled: boolean; enrolledAt: string }>(
        `/api/tenants/${tenantId}/gym/face-enrollment`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkIns.faceEnrollment(tenantId),
      }),
  });
}
