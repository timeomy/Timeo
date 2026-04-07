import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface CheckIn {
  id: string;
  tenantId: string;
  userId: string;
  method: "qr" | "face" | "nfc" | "manual";
  checkedInAt: string;
  userName?: string;
  userEmail?: string;
  checkedInByName?: string;
  membershipName?: string;
  location?: string;
  status?: "granted" | "denied";
}

interface CheckInStats {
  today: number;
  thisWeek: number;
  monthCount: number;
  uniqueToday: number;
  byMethod: {
    qr: number;
    nfc: number;
    manual: number;
  };
}

export function useCheckIns(
  tenantId: string | null | undefined,
  options?: { date?: string },
) {
  const date = options?.date;
  return useQuery({
    queryKey: [...queryKeys.checkIns.all(tenantId ?? ""), date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return api.get<CheckIn[]>(`/api/tenants/${tenantId}/check-ins${params}`);
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCheckInStats(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.all(tenantId ?? ""), "stats"],
    queryFn: () =>
      api.get<CheckInStats>(`/api/tenants/${tenantId}/check-ins/stats`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useCreateCheckIn(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      userId?: string;
      email?: string;
      method: "qr" | "nfc" | "manual";
    }) =>
      api.post<{ checkInId: string }>(
        `/api/tenants/${tenantId}/check-ins`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkIns.all(tenantId),
      }),
  });
}

export function useCheckInByQr(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (qrCode: string) =>
      api.post<{
        checkInId: string;
        member?: {
          name: string;
          email?: string;
          membershipName?: string;
          photoUrl?: string;
        };
      }>(`/api/tenants/${tenantId}/check-ins`, {
        qrCode,
        method: "qr",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkIns.all(tenantId),
      }),
  });
}

export function useMyCheckInHistory(
  tenantId: string | null | undefined,
  options?: { page?: number; limit?: number },
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  return useQuery({
    queryKey: [...queryKeys.checkIns.myHistory(tenantId ?? ""), page, limit],
    queryFn: () =>
      api.get<{
        items: CheckIn[];
        total: number;
        page: number;
        limit: number;
      }>(
        `/api/tenants/${tenantId}/check-ins/my-history?page=${page}&limit=${limit}`,
      ),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
