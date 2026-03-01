import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import {
  TrendingUp,
  Calendar,
  ShoppingBag,
  BarChart3,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useRevenueOverview,
  useBookingAnalytics,
  useTopServices,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Spacer,
  LoadingScreen,
  EmptyState,
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

export default function AdminDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [period, setPeriod] = useState<Period>("month");

  const {
    data: revenue,
    isLoading: loadingRevenue,
    refetch: refetchRevenue,
    isRefetching: refetchingRevenue,
  } = useRevenueOverview(tenantId, period);

  const {
    data: bookings,
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useBookingAnalytics(tenantId, period);

  const {
    data: topServices,
    isLoading: loadingTop,
    refetch: refetchTop,
  } = useTopServices(tenantId);

  const isLoading = loadingRevenue || loadingBookings || loadingTop;

  const handleRefresh = () => {
    refetchRevenue();
    refetchBookings();
    refetchTop();
  };

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to view the dashboard."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const comparisonText =
    revenue?.periodComparison != null
      ? revenue.periodComparison >= 0
        ? `+${revenue.periodComparison.toFixed(1)}%`
        : `${revenue.periodComparison.toFixed(1)}%`
      : null;

  return (
    <Screen padded={false}>
      <Header title="Dashboard" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refetchingRevenue}
            onRefresh={handleRefresh}
          />
        }
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
                  period === opt.value
                    ? theme.colors.primary + "20"
                    : theme.colors.surface,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    period === opt.value
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Card */}
        <View className="mx-4 mb-3 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TrendingUp size={18} color={theme.colors.primary} />
            <Text className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
              Revenue
            </Text>
          </View>
          <Spacer size={8} />
          <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
            {formatPrice(revenue?.totalRevenue ?? 0)}
          </Text>
          {comparisonText && (
            <Text
              className="mt-1 text-sm font-medium"
              style={{
                color:
                  (revenue?.periodComparison ?? 0) >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              }}
            >
              {comparisonText} vs previous period
            </Text>
          )}
        </View>

        {/* Bookings & Orders Summary */}
        <View className="flex-row px-4" style={{ gap: 12 }}>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Calendar size={16} color={theme.colors.primary} />
              <Text className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
                Bookings
              </Text>
            </View>
            <Text className="mt-2 text-xl font-bold" style={{ color: theme.colors.text }}>
              {bookings?.totalBookings ?? 0}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
              {bookings?.completedBookings ?? 0} completed
            </Text>
          </View>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <ShoppingBag size={16} color={theme.colors.primary} />
              <Text className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
                Completion Rate
              </Text>
            </View>
            <Text className="mt-2 text-xl font-bold" style={{ color: theme.colors.text }}>
              {((bookings?.completionRate ?? 0) * 100).toFixed(0)}%
            </Text>
            <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
              {bookings?.cancelledBookings ?? 0} cancelled
            </Text>
          </View>
        </View>

        <Spacer size={16} />

        {/* Quick Actions */}
        <TouchableOpacity
          className="mx-4 mb-3 flex-row items-center rounded-2xl p-4"
          style={{ backgroundColor: theme.colors.surface }}
          onPress={() => router.push("/analytics" as any)}
        >
          <BarChart3 size={20} color={theme.colors.primary} />
          <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
            View Full Analytics
          </Text>
        </TouchableOpacity>

        {/* Top Services */}
        {topServices && topServices.length > 0 && (
          <View className="px-4">
            <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
              Top Services
            </Text>
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
              {topServices.slice(0, 5).map((service, index) => (
                <View key={service.id}>
                  <View className="flex-row items-center justify-between p-4">
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: theme.colors.text }} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {service.count} bookings
                      </Text>
                    </View>
                    <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {formatPrice(service.revenue)}
                    </Text>
                  </View>
                  {index < Math.min(topServices.length, 5) - 1 && (
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
