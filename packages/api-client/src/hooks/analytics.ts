import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface RevenueOverview {
  totalRevenue: number;
  currency: string;
  periodComparison: number;
  byDay: Array<{ date: string; amount: number }>;
  byPaymentMethod: Array<{ method: string; amount: number }>;
}

interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  completionRate: number;
  byDay: Array<{ date: string; count: number }>;
  bookingsByStatus?: {
    pending?: number;
    confirmed?: number;
    completed?: number;
    cancelled?: number;
    no_show?: number;
  };
}

interface OrderAnalytics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  currency: string;
  byDay: Array<{ date: string; count: number; amount: number }>;
  ordersByStatus?: {
    pending?: number;
    confirmed?: number;
    completed?: number;
    cancelled?: number;
  };
}

interface TopItem {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
}

interface StaffPerformance {
  staffId: string;
  staffName: string;
  bookingsCompleted: number;
  revenue: number;
  avgRating?: number;
}

export function useRevenueOverview(
  tenantId: string | null | undefined,
  period?: string,
) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue(tenantId ?? "", period),
    queryFn: () => {
      const params = period ? `?period=${period}` : "";
      return api.get<RevenueOverview>(
        `/api/tenants/${tenantId}/analytics/revenue${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useBookingAnalytics(
  tenantId: string | null | undefined,
  period?: string,
) {
  return useQuery({
    queryKey: queryKeys.analytics.bookings(tenantId ?? "", period),
    queryFn: () => {
      const params = period ? `?period=${period}` : "";
      return api.get<BookingAnalytics>(
        `/api/tenants/${tenantId}/analytics/bookings${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useTopServices(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.topServices(tenantId ?? ""),
    queryFn: () =>
      api.get<TopItem[]>(`/api/tenants/${tenantId}/analytics/top-services`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useTopProducts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.topProducts(tenantId ?? ""),
    queryFn: () =>
      api.get<TopItem[]>(`/api/tenants/${tenantId}/analytics/top-products`),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useCustomerAnalytics(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.customers(tenantId ?? ""),
    queryFn: () =>
      api.get<CustomerAnalytics>(
        `/api/tenants/${tenantId}/analytics/customers`,
      ),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useOrderAnalytics(
  tenantId: string | null | undefined,
  period?: string,
) {
  return useQuery({
    queryKey: queryKeys.analytics.orders(tenantId ?? "", period),
    queryFn: () => {
      const params = period ? `?period=${period}` : "";
      return api.get<OrderAnalytics>(
        `/api/tenants/${tenantId}/analytics/orders${params}`,
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useStaffPerformance(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.staff(tenantId ?? ""),
    queryFn: () =>
      api.get<StaffPerformance[]>(
        `/api/tenants/${tenantId}/analytics/staff`,
      ),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
