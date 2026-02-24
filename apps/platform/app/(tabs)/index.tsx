import React, { useCallback, useState } from "react";
import { View, Text, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  Users,
  CalendarCheck,
  Activity,
  Plus,
  Flag,
  ClipboardList,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
} from "lucide-react-native";
import {
  Screen,
  StatCard,
  Section,
  Card,
  Badge,
  Button,
  Spacer,
  Skeleton,
  Row,
  BarChart,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { formatPrice, formatRelativeTime } from "@timeo/shared";

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const platformOverview = useQuery(api.analytics.getPlatformOverview);
  const tenants = useQuery(api.tenants.list);
  const revenueRankings = useQuery(api.analytics.getTenantRankings, {
    metric: "revenue",
    limit: 5,
  });
  const bookingRankings = useQuery(api.analytics.getTenantRankings, {
    metric: "bookings",
    limit: 5,
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (platformOverview === undefined || tenants === undefined) {
    return (
      <Screen scroll>
        <View className="mt-4">
          <Skeleton className="mb-2 h-8 w-48 rounded-lg" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </View>
        <View className="mt-6 flex-row flex-wrap gap-3">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </View>
        <View className="mt-3 flex-row flex-wrap gap-3">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </View>
        <View className="mt-8">
          <Skeleton className="mb-4 h-6 w-32 rounded-lg" />
          <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
          <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }

  const displayName = user?.name ?? "Admin";
  const growth = platformOverview.growthMetrics;

  return (
    <Screen scroll={false}>
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
        {/* Header */}
        <View className="mb-2 mt-4">
          <Text
            className="text-sm font-medium"
            style={{ color: theme.colors.textSecondary }}
          >
            Platform Admin
          </Text>
          <Text
            className="mt-0.5 text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Hello, {displayName}
          </Text>
        </View>

        {/* Stat Cards */}
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              label="Total Tenants"
              value={platformOverview.totalTenants}
              icon={<Building2 size={18} color={theme.colors.primary} />}
              trend={
                growth.tenantGrowthPercent !== 0
                  ? {
                      value: Math.abs(growth.tenantGrowthPercent),
                      direction:
                        growth.tenantGrowthPercent >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Total Users"
              value={platformOverview.totalUsers}
              icon={<Users size={18} color={theme.colors.secondary} />}
              trend={
                growth.userGrowthPercent !== 0
                  ? {
                      value: Math.abs(growth.userGrowthPercent),
                      direction:
                        growth.userGrowthPercent >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
          </View>
        </View>

        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              label="Total Bookings"
              value={platformOverview.totalBookings}
              icon={<CalendarCheck size={18} color={theme.colors.warning} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Total Revenue"
              value={formatPrice(platformOverview.totalRevenue)}
              icon={<DollarSign size={18} color={theme.colors.success} />}
            />
          </View>
        </View>

        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              label="Total Orders"
              value={platformOverview.totalOrders}
              icon={<ShoppingCart size={18} color={theme.colors.info} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Active Tenants"
              value={platformOverview.activeTenants}
              icon={<Activity size={18} color={theme.colors.success} />}
            />
          </View>
        </View>

        {/* Plan Distribution */}
        <Section title="Tenant Plans">
          <Card>
            {Object.entries(platformOverview.tenantsByPlan).map(
              ([plan, count]) => (
                <Row key={plan} justify="between" className="mb-1">
                  <Text
                    className="text-sm capitalize"
                    style={{ color: theme.colors.text }}
                  >
                    {plan}
                  </Text>
                  <Badge label={`${count}`} variant="default" />
                </Row>
              )
            )}
          </Card>
        </Section>

        {/* Growth Metrics */}
        <Section title="Monthly Growth">
          <Card>
            <Row justify="between" align="center" className="mb-2">
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                New Tenants
              </Text>
              <View className="flex-row items-center">
                <Text
                  className="mr-2 text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {growth.newTenantsThisMonth}
                </Text>
                {growth.tenantGrowthPercent !== 0 ? (
                  <View className="flex-row items-center">
                    {growth.tenantGrowthPercent > 0 ? (
                      <TrendingUp size={14} color={theme.colors.success} />
                    ) : (
                      <TrendingDown size={14} color={theme.colors.error} />
                    )}
                    <Text
                      className="ml-1 text-xs font-medium"
                      style={{
                        color:
                          growth.tenantGrowthPercent > 0
                            ? theme.colors.success
                            : theme.colors.error,
                      }}
                    >
                      {Math.abs(growth.tenantGrowthPercent)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </Row>
            <Row justify="between" align="center">
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                New Users
              </Text>
              <View className="flex-row items-center">
                <Text
                  className="mr-2 text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {growth.newUsersThisMonth}
                </Text>
                {growth.userGrowthPercent !== 0 ? (
                  <View className="flex-row items-center">
                    {growth.userGrowthPercent > 0 ? (
                      <TrendingUp size={14} color={theme.colors.success} />
                    ) : (
                      <TrendingDown size={14} color={theme.colors.error} />
                    )}
                    <Text
                      className="ml-1 text-xs font-medium"
                      style={{
                        color:
                          growth.userGrowthPercent > 0
                            ? theme.colors.success
                            : theme.colors.error,
                      }}
                    >
                      {Math.abs(growth.userGrowthPercent)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </Row>
          </Card>
        </Section>

        {/* Tenant Rankings by Revenue */}
        <Section title="Top Tenants by Revenue">
          {revenueRankings === undefined ? (
            <Skeleton height={80} borderRadius={12} />
          ) : (revenueRankings ?? []).length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No revenue data yet.
              </Text>
            </Card>
          ) : (
            <View>
              {(revenueRankings ?? []).map((t, i) => (
                <Card key={t.tenantId} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="mr-3 h-7 w-7 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: theme.colors.success + "20",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: theme.colors.success }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                        numberOfLines={1}
                      >
                        {t.tenantName}
                      </Text>
                    </View>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.success }}
                    >
                      {formatPrice(t.value)}
                    </Text>
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* Tenant Rankings by Bookings */}
        <Section title="Top Tenants by Bookings">
          {bookingRankings === undefined ? (
            <Skeleton height={80} borderRadius={12} />
          ) : (bookingRankings ?? []).length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No booking data yet.
              </Text>
            </Card>
          ) : (
            <View>
              {(bookingRankings ?? []).map((t, i) => (
                <Card key={t.tenantId} className="mb-2">
                  <Row justify="between" align="center">
                    <View className="flex-row items-center flex-1">
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
                      <Text
                        className="flex-1 text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                        numberOfLines={1}
                      >
                        {t.tenantName}
                      </Text>
                    </View>
                    <Badge label={`${t.value}`} variant="info" />
                  </Row>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* Quick Actions */}
        <Section title="Quick Actions">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={() => router.push("/tenants/new")}>
                <View className="flex-row items-center">
                  <Plus size={16} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
                  <Text className="ml-2 font-semibold" style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}>
                    New Tenant
                  </Text>
                </View>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => router.push("/(tabs)/flags")}
              >
                <View className="flex-row items-center">
                  <Flag size={16} color={theme.colors.text} />
                  <Text
                    className="ml-2 font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    Flags
                  </Text>
                </View>
              </Button>
            </View>
          </View>
        </Section>

        {/* Recent Tenants */}
        <Section
          title="Recent Tenants"
          seeAll={{
            label: "View all",
            onPress: () => router.push("/(tabs)/tenants"),
          }}
        >
          {tenants.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No tenants yet. Create your first tenant to get started.
              </Text>
            </Card>
          ) : (
            tenants.slice(0, 5).map((tenant) => (
              <TouchableOpacity
                key={tenant._id}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(`/tenants/${tenant._id}` as any)
                }
              >
                <Card className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {tenant.name}
                      </Text>
                      <Text
                        className="mt-0.5 text-sm"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        /{tenant.slug}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Badge
                        label={tenant.plan}
                        variant={
                          tenant.plan === "enterprise"
                            ? "warning"
                            : tenant.plan === "pro"
                              ? "default"
                              : tenant.plan === "starter"
                                ? "info"
                                : "default"
                        }
                      />
                      <ChevronRight
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Audit Log Quick Link */}
        <Section title="Audit Logs">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/logs")}
          >
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="mr-3 rounded-full p-2"
                    style={{ backgroundColor: theme.colors.primary + "15" }}
                  >
                    <ClipboardList size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      View Audit Logs
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Track all platform activity
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        </Section>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
