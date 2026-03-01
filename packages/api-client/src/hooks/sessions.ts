import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface SessionPackage {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** Number of sessions in the package */
  sessionCount: number;
  price: number;
  currency: string;
  validityDays: number;
  isActive: boolean;
  createdAt: string;
}

interface SessionCredit {
  id: string;
  tenantId: string;
  userId: string;
  packageId: string;
  remaining: number;
  totalSessions: number;
  usedSessions: number;
  expiresAt: string;
  packageName?: string;
  purchasedAt?: string;
}

interface ExerciseEntry {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

interface SessionLog {
  id: string;
  tenantId: string;
  userId: string;
  creditId?: string;
  serviceId?: string;
  usedAt: string;
  createdAt: string;
  userName?: string;
  serviceName?: string;
  /** Session type e.g. personal_training, group_class */
  sessionType?: string;
  clientName?: string;
  clientEmail?: string;
  coachName?: string;
  notes?: string;
  exercises: ExerciseEntry[];
  metrics?: Record<string, unknown>;
}

export function useSessionPackages(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.packages(tenantId ?? ""),
    queryFn: () =>
      api.get<SessionPackage[]>(
        `/api/tenants/${tenantId}/sessions/packages`,
      ),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useSessionCredits(
  tenantId: string | null | undefined,
  userId?: string,
) {
  return useQuery({
    queryKey: queryKeys.sessions.credits(tenantId ?? "", userId),
    queryFn: () => {
      const params = userId ? `?userId=${userId}` : "";
      return api.get<SessionCredit[]>(
        `/api/tenants/${tenantId}/sessions/credits${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useSessionLogs(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.logs(tenantId ?? ""),
    queryFn: () =>
      api.get<SessionLog[]>(`/api/tenants/${tenantId}/sessions/logs`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCreateSessionPackage(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      sessionCount: number;
      price: number;
      validityDays?: number;
      description?: string;
      currency?: string;
    }) =>
      api.post<{ packageId: string }>(
        `/api/tenants/${tenantId}/sessions/packages`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.packages(tenantId),
      }),
  });
}

export function useUpdateSessionPackage(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      sessionCount?: number;
      price?: number;
      currency?: string;
      validityDays?: number;
      isActive?: boolean;
    }) =>
      api.patch(
        `/api/tenants/${tenantId}/sessions/packages/${id}`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.packages(tenantId),
      }),
  });
}

export function useDeleteSessionPackage(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) =>
      api.delete(
        `/api/tenants/${tenantId}/sessions/packages/${packageId}`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.packages(tenantId),
      }),
  });
}

export function usePurchaseSessionPackage(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { packageId: string; userId: string }) =>
      api.post<{ creditId: string }>(
        `/api/tenants/${tenantId}/sessions/credits`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.credits(tenantId),
      });
    },
  });
}

/** Assign a session package to a member (admin action) */
export function useAssignSessionPackage(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { packageId: string; userId: string }) =>
      api.post<{ creditId: string }>(
        `/api/tenants/${tenantId}/sessions/credits`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.credits(tenantId),
      }),
  });
}

/** Manually adjust session credit totals/used counts for a member */
export function useAdjustSessionCredits(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditId,
      ...data
    }: {
      creditId: string;
      totalSessions?: number;
      usedSessions?: number;
      reason?: string;
    }) =>
      api.patch(
        `/api/tenants/${tenantId}/sessions/credits/${creditId}`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.credits(tenantId),
      }),
  });
}

export function useCreateSessionLog(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      creditId?: string;
      userId?: string;
      serviceId?: string;
      clientEmail?: string;
      sessionType?: string;
      notes?: string;
      exercises?: ExerciseEntry[];
      metrics?: Record<string, unknown>;
    }) =>
      api.post<{ logId: string }>(
        `/api/tenants/${tenantId}/sessions/logs`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.logs(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.credits(tenantId),
      });
    },
  });
}

export function useDeleteSessionLog(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) =>
      api.delete(`/api/tenants/${tenantId}/sessions/logs/${logId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.logs(tenantId),
      }),
  });
}
