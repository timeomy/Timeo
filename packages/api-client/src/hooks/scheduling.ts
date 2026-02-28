import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  dayOfWeek: number;
  isOpen: boolean;
  /** Slot-based format */
  slots?: TimeSlot[];
  /** Flat format: open/close times */
  openTime?: string;
  closeTime?: string;
}

interface StaffAvailability {
  staffId: string;
  schedule: DaySchedule[];
  overrides?: Array<{ date: string; slots: TimeSlot[]; isOff?: boolean }>;
}

interface BlockedSlot {
  id: string;
  tenantId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  reason?: string;
  createdAt: string;
}

export function useStaffAvailability(
  tenantId: string | null | undefined,
  staffId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.scheduling.availability(
      tenantId ?? "",
      staffId ?? "",
    ),
    queryFn: () =>
      api.get<StaffAvailability>(
        `/api/tenants/${tenantId}/scheduling/availability/${staffId}`,
      ),
    enabled: !!tenantId && !!staffId,
  });
}

export function useUpdateStaffAvailability(
  tenantId: string,
  staffId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { schedule: DaySchedule[] }) =>
      api.put(
        `/api/tenants/${tenantId}/scheduling/availability/${staffId}`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduling.availability(tenantId, staffId),
      }),
  });
}

export function useBusinessHours(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.scheduling.businessHours(tenantId ?? ""),
    queryFn: () =>
      api.get<DaySchedule[]>(
        `/api/tenants/${tenantId}/scheduling/business-hours`,
      ),
    enabled: !!tenantId,
  });
}

export function useUpdateBusinessHours(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { schedule?: DaySchedule[]; hours?: DaySchedule[] }) =>
      api.put(
        `/api/tenants/${tenantId}/scheduling/business-hours`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduling.businessHours(tenantId),
      }),
  });
}

export function useBlockedSlots(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.scheduling.blockedSlots(tenantId ?? ""),
    queryFn: () =>
      api.get<BlockedSlot[]>(
        `/api/tenants/${tenantId}/scheduling/blocked-slots`,
      ),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCreateBlockedSlot(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      staffId?: string;
      startTime: string;
      endTime: string;
      reason?: string;
    }) =>
      api.post<{ blockedSlotId: string }>(
        `/api/tenants/${tenantId}/scheduling/blocked-slots`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduling.blockedSlots(tenantId),
      }),
  });
}

export function useDeleteBlockedSlot(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      api.delete(
        `/api/tenants/${tenantId}/scheduling/blocked-slots/${slotId}`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduling.blockedSlots(tenantId),
      }),
  });
}
