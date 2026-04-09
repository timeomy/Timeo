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

interface CheckInListApiRow {
  checkIn: {
    id: string;
    tenant_id: string;
    user_id: string;
    method: "qr" | "face" | "nfc" | "manual";
    timestamp: string;
  };
  user: {
    name?: string;
    email?: string;
  } | null;
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
    queryFn: async () => {
      const params = date ? `?date=${date}` : "";
      const rows = await api.get<CheckInListApiRow[]>(
        `/api/tenants/${tenantId}/check-ins${params}`,
      );

      return rows.map((row) => ({
        id: row.checkIn.id,
        tenantId: row.checkIn.tenant_id,
        userId: row.checkIn.user_id,
        method: row.checkIn.method,
        checkedInAt: new Date(row.checkIn.timestamp).toISOString(),
        userName: row.user?.name,
        userEmail: row.user?.email,
      }));
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
        validation?: {
          valid: boolean;
          code: string;
          message: string;
        };
        member?: {
          name: string;
          email?: string | null;
          membershipName?: string | null;
          photoUrl?: string | null;
        };
      }>(`/api/tenants/${tenantId}/check-ins/scan`, {
        qrCode,
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
