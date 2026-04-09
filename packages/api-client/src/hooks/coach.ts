import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

export interface CoachClient {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  planStatus: string | null;
  planName: string | null;
  totalClasses: number | null;
  remainingClasses: number | null;
  packagePreset: string | null;
  subscriptionPeriodEnd: string | null;
  lastSessionDate: string | null;
}

export interface CoachScheduleItem {
  id: string;
  source: "coach_booking" | "group_class";
  title: string;
  startAt: string;
  endAt?: string | null;
  status?: string;
  notes?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientAvatar?: string | null;
  classId?: string;
  location?: string | null;
  enrolledCount?: number;
  attendedCount?: number;
}

export interface AttendanceEnrollment {
  enrollmentId: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  memberAvatar: string | null;
  status: string;
  attended: boolean;
  attendedAt: string | null;
}

export interface ClassAttendance {
  class: {
    classId: string;
    className: string;
    location: string | null;
    startAt: string | null;
    endAt: string | null;
  } | null;
  enrollments: AttendanceEnrollment[];
}

export function useCoachClients(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.coach.clients(tenantId ?? ""),
    queryFn: () => api.get<CoachClient[]>(`/api/tenants/${tenantId}/coach/clients`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCoachSchedule(
  tenantId: string | null | undefined,
  coachId?: string,
) {
  return useQuery({
    queryKey: queryKeys.coach.schedule(tenantId ?? "", coachId),
    queryFn: () => {
      const params = coachId
        ? `?coachId=${encodeURIComponent(coachId)}`
        : "";

      return api.get<CoachScheduleItem[]>(
        `/api/tenants/${tenantId}/coach/schedule${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useClassAttendance(
  tenantId: string | null | undefined,
  classId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.coach.attendance(tenantId ?? "", classId ?? ""),
    queryFn: () =>
      api.get<ClassAttendance>(
        `/api/tenants/${tenantId}/coach/attendance/classes/${classId}`,
      ),
    enabled: !!tenantId && !!classId,
    staleTime: 10_000,
  });
}

export function useMarkAttendance(tenantId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enrollmentId,
      attended,
    }: {
      enrollmentId: string;
      attended: boolean;
    }) =>
      api.patch(
        `/api/tenants/${tenantId}/coach/attendance/classes/${classId}/enrollments/${enrollmentId}`,
        { attended },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.coach.attendance(tenantId, classId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.coach.schedule(tenantId),
      });
    },
  });
}
