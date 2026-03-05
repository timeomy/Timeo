import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  DollarSign,
  CalendarCheck,
  ShoppingCart,
  Users,
  UserCheck,
  TrendingUp,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  StatCard,
  Section,
  Card,
  Row,
  Spacer,
  Skeleton,
  BarChart,
  ProgressRing,
  useTheme,
} from "@timeo/ui";
import { formatPrice } from "@timeo/shared";
import type { AnalyticsPeriod } from "@timeo/shared";
import {
  useRevenueOverview,
  useBookingAnalytics,
  useOrderAnalytics,
  useTopServices,
  useTopProducts,
  useCustomerAnalytics,
  useStaffPerformance,
} from "@timeo/api-client";

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export default function AnalyticsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const tenantId = activeTenantId as string;

  const { data: revenue, isLoading: revenueLoading } = useRevenueOverview(tenantId, period);
  const { data: bookingStats, isLoading: bookingLoading } = useBookingAnalytics(tenantId, period);
  const { data: orderStats, isLoading: orderLoading } = useOrderAnalytics(tenantId, period);
  const { data: topServices } = useTopServices(tenantId);
  const { data: topProducts } = useTopProducts(tenantId);
  const { data: customerStats } = useCustomerAnalytics(tenantId);
  const { data: staffPerformance } = useStaffPerformance(tenantId);

  const isLoading = revenueLoading || bookingLoading || orderLoading;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          className="text-xl font-bold"
          style={{ color: theme.colors.text }}
        >
          Analytics
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Period Selector */}
        <View className="mb-4 flex-row gap-2">
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
                    period === opt.value
                      ? theme.dark ? "#0B0B0F" : "#FFFFFF"
                      : theme.colors.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Revenue Section ─────────────────────────────────────── */}
        <Section title="Revenue">
          {isLoading ? (
            <Skeleton height={200} borderRadius={12} />
          ) : (
            <View>
              <Row gap={12} wrap>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    label="Total Revenue"
                    value={formatPrice(revenue?.totalRevenue ?? 0)}
                    icon={
                      <DollarSign size={18} color={theme.colors.success} />
                    }
                    trend={
                      revenue?.periodComparison !== undefined
                        ? {
                            value: Math.abs(revenue.periodComparison),
                            direction:
                              revenue.periodComparison >= 0 ? "up" : "down",
                          }
                        : undefined
                    }
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Card>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      By Payment Method
                    </Text>
                    <View className="mt-2">
                      {(revenue?.byPaymentMethod ?? []).slice(0, 2).map((m) => (
                        <Row key={m.method} justify="between">
                          <Text
                            className="text-sm capitalize"
                            style={{ color: theme.colors.text }}
                          >
                            {m.method}
                          </Text>
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: theme.colors.text }}
                          >
                            {formatPrice(m.amount)}
                          </Text>
                        </Row>
                      ))}
                    </View>
                  </Card>
                </View>
              </Row>
              <Spacer size={12} />
              <Card>
                <Text
                  className="mb-2 text-sm font-medium"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Daily Revenue
                </Text>
                <BarChart
                  data={(revenue?.byDay ?? []).slice(-14).map((d) => ({
                    label: d.date.slice(8),
                    value: d.amount,
                  }))}
                  height={100}
                  barColor={theme.colors.primary}
                />
              </Card>
            </View>
          )}
        </Section>

        {/* ── Bookings Section ────────────────────────────────────── */}
        <Section title="Bookings">
          {bookingLoading ? (
            <Skeleton height={160} borderRadius={12} />
          ) : (
            <View>
              <Row gap={12} wrap>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    label="Total"
                    value={bookingStats?.totalBookings ?? 0}
                    icon={
                      <CalendarCheck size={18} color={theme.colors.primary} />
                    }
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <View className="items-center rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
                    <ProgressRing
                      progress={bookingStats?.completionRate ?? 0}
                      size={64}
                      strokeWidth={6}
                      color={theme.colors.success}
                      label="Completion"
                    />
                  </View>
                </View>
              </Row>
              <Spacer size={12} />
              {bookingStats?.bookingsByStatus ? (
                <Card>
                  <Text
                    className="mb-2 text-sm font-medium"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    By Status
                  </Text>
                  {Object.entries(bookingStats.bookingsByStatus).map(
                    ([status, count]) => (
                      <Row key={status} justify="between" className="mb-1">
                        <Text
                          className="text-sm capitalize"
                          style={{ color: theme.colors.text }}
                        >
                          {status.replace("_", " ")}
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                        >
                          {count as number}
                        </Text>
                      </Row>
                    )
                  )}
                </Card>
              ) : null}
              <Spacer size={12} />
              <Card>
                <Text
                  className="mb-2 text-sm font-medium"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Daily Bookings
                </Text>
                <BarChart
                  data={(bookingStats?.byDay ?? []).slice(-14).map(
                    (d) => ({
                      label: d.date.slice(8),
                      value: d.count,
                    })
                  )}
                  height={80}
                  barColor={theme.colors.info}
                />
              </Card>
            </View>
          )}
        </Section>

        {/* ── Orders Section ──────────────────────────────────────── */}
        <Section title="Orders">
          {orderLoading ? (
            <Skeleton height={120} borderRadius={12} />
          ) : (
            <View>
              <Row gap={12} wrap>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    label="Total Orders"
                    value={orderStats?.totalOrders ?? 0}
                    icon={
                      <ShoppingCart size={18} color={theme.colors.info} />
                    }
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    label="Total Revenue"
                    value={formatPrice(orderStats?.totalRevenue ?? 0)}
                    icon={
                      <DollarSign size={18} color={theme.colors.success} />
                    }
                  />
                </View>
              </Row>
              {orderStats?.ordersByStatus ? (
                <>
                  <Spacer size={12} />
                  <Card>
                    <Text
                      className="mb-2 text-sm font-medium"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      By Status
                    </Text>
                    {Object.entries(orderStats.ordersByStatus).map(
                      ([status, count]) => (
                        <Row key={status} justify="between" className="mb-1">
                          <Text
                            className="text-sm capitalize"
                            style={{ color: theme.colors.text }}
                          >
                            {status.replace("_", " ")}
                          </Text>
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: theme.colors.text }}
                          >
                            {count as number}
                          </Text>
                        </Row>
                      )
                    )}
                  </Card>
                </>
              ) : null}
            </View>
          )}
        </Section>

        {/* ── Top Services Table ──────────────────────────────────── */}
        <Section title="Top Services">
          {!topServices ? (
            <Skeleton height={100} borderRadius={12} />
          ) : topServices.length === 0 ? (
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
              {topServices.map((svc, i) => (
                <Card key={svc.id} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-1 flex-row items-center">
                      <View
                        className="mr-3 h-7 w-7 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: theme.colors.primary + "20",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: theme.colors.primary }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                          numberOfLines={1}
                        >
                          {svc.name}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {svc.count} bookings
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {formatPrice(svc.revenue)}
                      </Text>
                    </View>
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* ── Top Products Table ──────────────────────────────────── */}
        <Section title="Top Products">
          {!topProducts ? (
            <Skeleton height={100} borderRadius={12} />
          ) : topProducts.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No product data for this period.
              </Text>
            </Card>
          ) : (
            <View>
              {topProducts.map((prod, i) => (
                <Card key={prod.id} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-1 flex-row items-center">
                      <View
                        className="mr-3 h-7 w-7 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: theme.colors.info + "20",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: theme.colors.info }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                          numberOfLines={1}
                        >
                          {prod.name}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {prod.count} sold
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {formatPrice(prod.revenue)}
                      </Text>
                    </View>
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* ── Customer Insights ───────────────────────────────────── */}
        <Section title="Customers">
          {!customerStats ? (
            <Skeleton height={120} borderRadius={12} />
          ) : (
            <View>
              <Row gap={12} wrap>
                <View className="flex-1 min-w-[30%]">
                  <StatCard
                    label="Total"
                    value={customerStats.totalCustomers}
                    icon={<Users size={16} color={theme.colors.primary} />}
                  />
                </View>
                <View className="flex-1 min-w-[30%]">
                  <StatCard
                    label="New"
                    value={customerStats.newCustomers}
                    icon={
                      <TrendingUp size={16} color={theme.colors.success} />
                    }
                  />
                </View>
                <View className="flex-1 min-w-[30%]">
                  <StatCard
                    label="Returning"
                    value={customerStats.returningCustomers}
                    icon={
                      <UserCheck size={16} color={theme.colors.info} />
                    }
                  />
                </View>
              </Row>
              {(customerStats.topSpenders ?? []).length > 0 ? (
                <View className="mt-3">
                  <Text
                    className="mb-2 text-sm font-medium"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Top Customers
                  </Text>
                  {customerStats.topSpenders.slice(0, 5).map((c) => (
                    <Card key={c.userId} className="mb-2">
                      <Row justify="between" align="center">
                        <View className="flex-1">
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: theme.colors.text }}
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                          <Text
                            className="text-xs"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {c.bookingCount} bookings
                          </Text>
                        </View>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.success }}
                        >
                          {formatPrice(c.totalSpend)}
                        </Text>
                      </Row>
                    </Card>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </Section>

        {/* ── Staff Performance ───────────────────────────────────── */}
        <Section title="Staff Performance">
          {!staffPerformance ? (
            <Skeleton height={100} borderRadius={12} />
          ) : staffPerformance.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No staff data for this period.
              </Text>
            </Card>
          ) : (
            <View>
              {staffPerformance.map((staff) => (
                <Card key={staff.staffId} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                        numberOfLines={1}
                      >
                        {staff.staffName}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {staff.bookingsCompleted} bookings completed
                      </Text>
                    </View>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.success }}
                    >
                      {formatPrice(staff.revenue)}
                    </Text>
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        <Spacer size={20} />
      </ScrollView>
    </Screen>
  );
}
