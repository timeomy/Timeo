import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingWithDetails extends Booking {
  // Flat denormalized fields from the API JOIN
  customerName?: string;
  customerEmail?: string;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: number;
  staffName?: string;
}

export function useBookings(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.all(tenantId ?? ""),
    queryFn: () =>
      api.get<BookingWithDetails[]>(`/api/tenants/${tenantId}/bookings`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useMyBookings(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.mine(tenantId ?? ""),
    queryFn: () =>
      api.get<BookingWithDetails[]>(`/api/tenants/${tenantId}/bookings/mine`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useBooking(
  tenantId: string | null | undefined,
  bookingId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.bookings.byId(tenantId ?? "", bookingId ?? ""),
    queryFn: () =>
      api.get<BookingWithDetails>(
        `/api/tenants/${tenantId}/bookings/${bookingId}`,
      ),
    enabled: !!tenantId && !!bookingId,
  });
}

export function useCreateBooking(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      serviceId: string;
      startTime: string;
      staffId?: string;
      notes?: string;
    }) =>
      api.post<{ bookingId: string }>(
        `/api/tenants/${tenantId}/bookings`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.mine(tenantId),
      });
    },
  });
}

export function useConfirmBooking(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.patch(`/api/tenants/${tenantId}/bookings/${bookingId}/confirm`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(tenantId),
      }),
  });
}

export function useCancelBooking(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason?: string;
    }) =>
      api.patch(`/api/tenants/${tenantId}/bookings/${bookingId}/cancel`, {
        reason,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(tenantId),
      }),
  });
}

export function useCompleteBooking(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.patch(`/api/tenants/${tenantId}/bookings/${bookingId}/complete`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(tenantId),
      }),
  });
}

export function useMarkNoShow(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.patch(`/api/tenants/${tenantId}/bookings/${bookingId}/no-show`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(tenantId),
      }),
  });
}
