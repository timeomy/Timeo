import React, { useState, useCallback } from "react";
import { View, Text, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  DollarSign,
  Briefcase,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronRight,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  StatCard,
  Section,
  Card,
  Row,
  Spacer,
  Skeleton,
  Badge,
  BarChart,
  useTheme,
} from "@timeo/ui";
import { formatPrice } from "@timeo/shared";
import type { AnalyticsPeriod } from "@timeo/shared";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, activeOrg } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const tenantId = activeTenantId as string;

  const revenue = useQuery(
    api.analytics.getRevenueOverview,
    tenantId ? { tenantId: tenantId as any, period } : "skip"
  );
  const bookingStats = useQuery(
    api.analytics.getBookingAnalytics,
    tenantId ? { tenantId: tenantId as any, period } : "skip"
  );
  const topServices = useQuery(
    api.analytics.getTopServices,
    tenantId ? { tenantId: tenantId as any, period, limit: 5 } : "skip"
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isLoading =
    revenue === undefined ||
    bookingStats === undefined ||
    topServices === undefined;

  if (!tenantId) {
    return (
      <Screen scroll>
        <Header title="Dashboard" />
        <View className="flex-1 items-center justify-center py-20">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            No organization selected. Please select an organization to continue.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Header title={activeOrg?.name ?? "Dashboard"} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Period Selector */}
        <View className="mb-4 mt-2 flex-row gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setPeriod(opt.value)}
              className="flex-1 items-center rounded-full py-2"
              style={{
                backgroundColor:
                  period === opt.value
                    ? theme.colors.primary
                    : theme.colors.surface,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    period === opt.value ? "#FFFFFF" : theme.colors.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <View>
            <Row gap={12} wrap>
              <View className="flex-1 min-w-[45%]">
                <Skeleton height={100} borderRadius={16} />
              </View>
              <View className="flex-1 min-w-[45%]">
                <Skeleton height={100} borderRadius={16} />
              </View>
            </Row>
            <Spacer size={12} />
            <Row gap={12} wrap>
              <View className="flex-1 min-w-[45%]">
                <Skeleton height={100} borderRadius={16} />
              </View>
              <View className="flex-1 min-w-[45%]">
                <Skeleton height={100} borderRadius={16} />
              </View>
            </Row>
          </View>
        ) : (
          <View>
            <Row gap={12} wrap>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Total Revenue"
                  value={formatPrice(revenue?.totalRevenue ?? 0)}
                  icon={
                    <DollarSign size={20} color={theme.colors.success} />
                  }
                  trend={
                    revenue?.percentChange !== undefined
                      ? {
                          value: Math.abs(revenue.percentChange),
                          direction:
                            revenue.percentChange >= 0 ? "up" : "down",
                        }
                      : undefined
                  }
                />
              </View>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Bookings"
                  value={bookingStats?.totalBookings ?? 0}
                  icon={
                    <CalendarCheck size={20} color={theme.colors.primary} />
                  }
                />
              </View>
            </Row>
            <Spacer size={12} />
            <Row gap={12} wrap>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Completion Rate"
                  value={`${bookingStats?.completionRate ?? 0}%`}
                  icon={
                    (bookingStats?.completionRate ?? 0) >= 50 ? (
                      <TrendingUp size={20} color={theme.colors.success} />
                    ) : (
                      <TrendingDown size={20} color={theme.colors.error} />
                    )
                  }
                />
              </View>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Avg/Day"
                  value={bookingStats?.averageBookingsPerDay ?? 0}
                  icon={
                    <Briefcase size={20} color={theme.colors.warning} />
                  }
                />
              </View>
            </Row>
          </View>
        )}

        {/* Revenue Chart */}
        <Section title="Revenue">
          {isLoading ? (
            <Skeleton height={140} borderRadius={12} />
          ) : (
            <Card>
              <Row justify="between" align="center" className="mb-3">
                <View>
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Bookings: {formatPrice(revenue?.bookingRevenue ?? 0)}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Orders: {formatPrice(revenue?.orderRevenue ?? 0)}
                  </Text>
                </View>
                {revenue?.percentChange !== undefined ? (
                  <Badge
                    label={`${revenue.percentChange >= 0 ? "+" : ""}${revenue.percentChange}%`}
                    variant={revenue.percentChange >= 0 ? "success" : "error"}
                  />
                ) : null}
              </Row>
              <BarChart
                data={(revenue?.revenueByDay ?? []).slice(-14).map((d) => ({
                  label: d.date.slice(5),
                  value: d.amount,
                }))}
                height={100}
                barColor={theme.colors.primary}
              />
            </Card>
          )}
        </Section>

        {/* Top Services */}
        <Section title="Top Services">
          {isLoading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={i} className="mb-2">
                  <Skeleton height={52} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : (topServices ?? []).length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No service data for this period.
              </Text>
            </Card>
          ) : (
            <View>
              {(topServices ?? []).map((service, index) => (
                <Card key={service.serviceId} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-1 flex-row items-center">
                      <View
                        className="mr-3 h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: theme.colors.primary + "20",
                        }}
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.colors.primary }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                          numberOfLines={1}
                        >
                          {service.serviceName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatPrice(service.revenue)} ({service.percentOfTotal}%)
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={`${service.bookingCount} bookings`}
                      variant="default"
                    />
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* View Full Analytics */}
        <Section title="">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/analytics" as any)}
          >
            <Card>
              <Row justify="between" align="center">
                <View className="flex-row items-center">
                  <View
                    className="mr-3 rounded-full p-2"
                    style={{ backgroundColor: theme.colors.primary + "15" }}
                  >
                    <BarChart3 size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      View Full Analytics
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Revenue, customers, staff performance
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </Row>
            </Card>
          </TouchableOpacity>
        </Section>

        <Spacer size={20} />
      </ScrollView>
    </Screen>
  );
}
