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
  tenantId?: string;
  userId?: string;
  clientId?: string;
  coachId?: string;
  creditId?: string;
  serviceId?: string;
  usedAt?: string;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  serviceName?: string;
  /** Session type e.g. personal_training, group_class */
  sessionType?: string;
  duration?: number | null;
  durationMinutes?: number | null;
  clientFeedback?: string | null;
  customSessionType?: string | null;
  photoUrl?: string | null;
  clientName?: string;
  clientAvatar?: string | null;
  clientEmail?: string;
  coachName?: string;
  coachEmail?: string;
  notes?: string;
  exercises: ExerciseEntry[];
  metrics?: Record<string, unknown>;
}

type SessionLogScope = "tenant" | "coach";

interface SessionLogOptions {
  scope?: SessionLogScope;
  clientId?: string;
  coachId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CreateSessionLogOptions {
  scope?: SessionLogScope;
}

interface CreateSessionLogInput {
  creditId?: string;
  userId?: string;
  clientId?: string;
  coachId?: string;
  serviceId?: string;
  clientEmail?: string;
  sessionType?: string;
  notes?: string;
  exercises?: ExerciseEntry[];
  metrics?: Record<string, unknown>;
  duration?: number;
  durationMinutes?: number;
  clientFeedback?: "great" | "good" | "tired" | "struggling";
  customSessionType?: string;
  photoUrl?: string;
  date?: string;
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

export function useSessionLogs(
  tenantId: string | null | undefined,
  options?: SessionLogOptions,
) {
  const scope = options?.scope ?? "tenant";

  return useQuery({
    queryKey:
      scope === "coach"
        ? [
            ...queryKeys.sessions.logs(tenantId ?? ""),
            "coach",
            options?.clientId ?? "",
            options?.coachId ?? "",
            options?.dateFrom ?? "",
            options?.dateTo ?? "",
          ]
        : queryKeys.sessions.logs(tenantId ?? ""),
    queryFn: () => {
      if (scope === "coach") {
        const params = new URLSearchParams();
        if (options?.clientId) params.set("clientId", options.clientId);
        if (options?.coachId) params.set("coachId", options.coachId);
        if (options?.dateFrom) params.set("dateFrom", options.dateFrom);
        if (options?.dateTo) params.set("dateTo", options.dateTo);

        const queryString = params.toString();
        return api.get<SessionLog[]>(
          `/api/tenants/${tenantId}/session-logs${
            queryString ? `?${queryString}` : ""
          }`,
        );
      }

      return api.get<SessionLog[]>(`/api/tenants/${tenantId}/sessions/logs`);
    },
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

export function useCreateSessionLog(
  tenantId: string,
  options?: CreateSessionLogOptions,
) {
  const queryClient = useQueryClient();
  const scope = options?.scope ?? "tenant";

  return useMutation({
    mutationFn: (data: CreateSessionLogInput) => {
      if (scope === "coach") {
        const clientId = data.clientId ?? data.userId;
        if (!clientId) {
          throw new Error("clientId is required for coach session logs");
        }

        const fallbackDuration = (() => {
          if (typeof data.durationMinutes === "number") {
            return Math.max(1, Math.round(data.durationMinutes));
          }

          if (typeof data.duration === "number") return data.duration;

          const metricDuration = data.metrics?.durationMinutes;
          if (typeof metricDuration === "number") {
            return Math.max(1, Math.round(metricDuration));
          }

          return 60;
        })();

        return api.post<{ id: string }>(`/api/tenants/${tenantId}/session-logs`, {
          clientId,
          coachId: data.coachId,
          sessionType: data.sessionType ?? "personal_training",
          duration: fallbackDuration,
          durationMinutes: fallbackDuration,
          clientFeedback: data.clientFeedback,
          customSessionType: data.customSessionType,
          photoUrl: data.photoUrl,
          notes: data.notes,
          exercises: data.exercises,
          metrics: data.metrics,
          date: data.date,
        });
      }

      return api
        .post<{ logId: string }>(`/api/tenants/${tenantId}/sessions/logs`, {
          clientId: data.clientId ?? data.userId,
          clientEmail: data.clientEmail,
          bookingId: undefined,
          creditId: data.creditId,
          sessionType: data.sessionType,
          durationMinutes: data.durationMinutes,
          clientFeedback: data.clientFeedback,
          customSessionType: data.customSessionType,
          photoUrl: data.photoUrl,
          notes: data.notes,
          exercises: data.exercises,
          metrics: data.metrics,
        })
        .then((result) => ({ id: result.logId }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.logs(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.sessions.logs(tenantId),
          "coach",
        ],
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
