import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  useRevenueOverview,
  useBookingAnalytics,
  useOrderAnalytics,
  useTopServices,
  useTopProducts,
  useCustomerAnalytics,
  useStaffPerformance,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Spacer,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

type Period = "day" | "week" | "month" | "year";

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

export default function AdminAnalyticsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [period, setPeriod] = useState<Period>("month");

  const { data: revenue, isLoading: lr, refetch: rr, isRefetching } = useRevenueOverview(tenantId, period);
  const { data: bookingStats, isLoading: lb, refetch: rb } = useBookingAnalytics(tenantId, period);
  const { data: orderStats, isLoading: lo, refetch: ro } = useOrderAnalytics(tenantId, period);
  const { data: topServices, refetch: rts } = useTopServices(tenantId);
  const { data: topProducts, refetch: rtp } = useTopProducts(tenantId);
  const { data: customerStats, refetch: rc } = useCustomerAnalytics(tenantId);
  const { data: staffPerf, refetch: rs } = useStaffPerformance(tenantId);

  const isLoading = lr || lb || lo;

  const handleRefresh = () => {
    rr(); rb(); ro(); rts(); rtp(); rc(); rs();
  };

  if (!tenantId || isLoading) {
    return <LoadingScreen message="Loading analytics..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Analytics" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
      >
        {/* Period Selector */}
        <View className="flex-row px-4 pb-4" style={{ gap: 8 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setPeriod(opt.value)}
              className="rounded-xl px-4 py-2"
              style={{
                backgroundColor:
                  period === opt.value ? theme.colors.primary + "20" : theme.colors.surface,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: period === opt.value ? theme.colors.primary : theme.colors.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue */}
        <View className="mx-4 mb-3 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
            Total Revenue
          </Text>
          <Text className="mt-1 text-2xl font-bold" style={{ color: theme.colors.text }}>
            {formatPrice(revenue?.totalRevenue ?? 0)}
          </Text>
          {revenue?.periodComparison != null && (
            <Text
              className="mt-1 text-sm font-medium"
              style={{
                color: revenue.periodComparison >= 0 ? theme.colors.success : theme.colors.error,
              }}
            >
              {revenue.periodComparison >= 0 ? "+" : ""}
              {revenue.periodComparison.toFixed(1)}% vs previous
            </Text>
          )}
        </View>

        {/* Bookings Summary */}
        <View className="mx-4 mb-3 flex-row" style={{ gap: 12 }}>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Bookings</Text>
            <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
              {bookingStats?.totalBookings ?? 0}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {bookingStats?.completedBookings ?? 0} done · {bookingStats?.cancelledBookings ?? 0} cancelled
            </Text>
          </View>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Orders</Text>
            <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
              {orderStats?.totalOrders ?? 0}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {formatPrice(orderStats?.totalRevenue ?? 0)} revenue
            </Text>
          </View>
        </View>

        {/* Customers */}
        {customerStats && (
          <View className="mx-4 mb-3 flex-row" style={{ gap: 12 }}>
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Customers</Text>
              <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
                {customerStats.totalCustomers}
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {customerStats.newCustomers} new
              </Text>
            </View>
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Retention</Text>
              <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
                {(customerStats.retentionRate * 100).toFixed(0)}%
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {customerStats.returningCustomers} returning
              </Text>
            </View>
          </View>
        )}

        {/* Top Services */}
        {topServices && topServices.length > 0 && (
          <View className="px-4 pt-2">
            <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
              Top Services
            </Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
              {topServices.slice(0, 5).map((s, i) => (
                <View key={s.id}>
                  <View className="flex-row items-center justify-between p-4">
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: theme.colors.text }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {s.count} bookings
                      </Text>
                    </View>
                    <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {formatPrice(s.revenue)}
                    </Text>
                  </View>
                  {i < Math.min(topServices.length, 5) - 1 && (
                    <View className="mx-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Products */}
        {topProducts && topProducts.length > 0 && (
          <View className="px-4 pt-4">
            <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
              Top Products
            </Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
              {topProducts.slice(0, 5).map((p, i) => (
                <View key={p.id}>
                  <View className="flex-row items-center justify-between p-4">
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: theme.colors.text }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {p.count} sold
                      </Text>
                    </View>
                    <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {formatPrice(p.revenue)}
                    </Text>
                  </View>
                  {i < Math.min(topProducts.length, 5) - 1 && (
                    <View className="mx-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Staff Performance */}
        {staffPerf && staffPerf.length > 0 && (
          <View className="px-4 pt-4">
            <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
              Staff Performance
            </Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
              {staffPerf.map((sp, i) => (
                <View key={sp.staffId}>
                  <View className="flex-row items-center justify-between p-4">
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: theme.colors.text }} numberOfLines={1}>
                        {sp.staffName}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {sp.bookingsCompleted} bookings completed
                      </Text>
                    </View>
                    <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {formatPrice(sp.revenue)}
                    </Text>
                  </View>
                  {i < staffPerf.length - 1 && (
                    <View className="mx-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
