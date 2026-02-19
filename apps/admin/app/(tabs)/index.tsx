import React, { useState, useCallback, useMemo } from "react";
import { View, Text, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  DollarSign,
  Briefcase,
  Package,
  TrendingUp,
  Clock,
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
  useTheme,
} from "@timeo/ui";
import { formatPrice, formatRelativeTime } from "@timeo/shared";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, activeOrg } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as string;

  const bookings = useQuery(
    api.bookings.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const services = useQuery(
    api.services.list,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const products = useQuery(
    api.products.list,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const orders = useQuery(
    api.orders.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries auto-refresh; simulate delay for UX
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isLoading =
    bookings === undefined ||
    services === undefined ||
    products === undefined ||
    orders === undefined;

  const stats = useMemo(() => {
    if (isLoading) return null;

    const totalBookings = bookings?.length ?? 0;
    const completedBookings =
      bookings?.filter((b) => b.status === "completed") ?? [];
    const totalRevenue = completedBookings.reduce((sum, b) => {
      return sum + (b.servicePrice ?? 0);
    }, 0);
    const orderRevenue =
      orders
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + o.totalAmount, 0) ?? 0;

    const activeServices =
      services?.filter((s) => s.isActive).length ?? 0;
    const activeProducts =
      products?.filter((p) => p.isActive).length ?? 0;

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todayBookings =
      bookings?.filter((b) => b.createdAt >= todayStart.getTime()).length ?? 0;
    const weekBookings =
      bookings?.filter((b) => b.createdAt >= weekStart.getTime()).length ?? 0;

    return {
      totalBookings,
      totalRevenue: totalRevenue + orderRevenue,
      activeServices,
      activeProducts,
      todayBookings,
      weekBookings,
    };
  }, [isLoading, bookings, services, products, orders]);

  const topServices = useMemo(() => {
    if (!bookings || !services) return [];

    const serviceCounts = new Map<string, number>();
    for (const b of bookings) {
      serviceCounts.set(
        b.serviceId,
        (serviceCounts.get(b.serviceId) ?? 0) + 1
      );
    }

    return services
      .filter((s) => s.isActive)
      .map((s) => ({
        ...s,
        bookingCount: serviceCounts.get(s._id) ?? 0,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);
  }, [bookings, services]);

  const recentActivity = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }, [bookings]);

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
                  label="Total Bookings"
                  value={stats?.totalBookings ?? 0}
                  icon={
                    <CalendarCheck
                      size={20}
                      color={theme.colors.primary}
                    />
                  }
                />
              </View>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Total Revenue"
                  value={formatPrice(stats?.totalRevenue ?? 0)}
                  icon={
                    <DollarSign
                      size={20}
                      color={theme.colors.success}
                    />
                  }
                />
              </View>
            </Row>
            <Spacer size={12} />
            <Row gap={12} wrap>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Active Services"
                  value={stats?.activeServices ?? 0}
                  icon={
                    <Briefcase
                      size={20}
                      color={theme.colors.warning}
                    />
                  }
                />
              </View>
              <View className="flex-1 min-w-[45%]">
                <StatCard
                  label="Active Products"
                  value={stats?.activeProducts ?? 0}
                  icon={
                    <Package
                      size={20}
                      color={theme.colors.info}
                    />
                  }
                />
              </View>
            </Row>
          </View>
        )}

        {/* Booking Trends */}
        <Section title="Booking Trends">
          {isLoading ? (
            <View>
              <Skeleton height={60} borderRadius={12} />
              <Spacer size={8} />
              <Skeleton height={60} borderRadius={12} />
            </View>
          ) : (
            <View>
              <Card>
                <Row justify="between" align="center">
                  <View className="flex-row items-center">
                    <Clock size={18} color={theme.colors.primary} />
                    <Text
                      className="ml-2 text-base font-medium"
                      style={{ color: theme.colors.text }}
                    >
                      Today
                    </Text>
                  </View>
                  <Text
                    className="text-xl font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {stats?.todayBookings ?? 0}
                  </Text>
                </Row>
              </Card>
              <Spacer size={8} />
              <Card>
                <Row justify="between" align="center">
                  <View className="flex-row items-center">
                    <TrendingUp size={18} color={theme.colors.success} />
                    <Text
                      className="ml-2 text-base font-medium"
                      style={{ color: theme.colors.text }}
                    >
                      This Week
                    </Text>
                  </View>
                  <Text
                    className="text-xl font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {stats?.weekBookings ?? 0}
                  </Text>
                </Row>
              </Card>
            </View>
          )}
        </Section>

        {/* Top Performing Services */}
        <Section title="Top Services">
          {isLoading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={i} className="mb-2">
                  <Skeleton height={52} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : topServices.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No services yet. Create your first service.
              </Text>
            </Card>
          ) : (
            <View>
              {topServices.map((service, index) => (
                <Card key={service._id} className="mb-2">
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
                          {service.name}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatPrice(service.price, service.currency)} /{" "}
                          {service.durationMinutes}min
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

        {/* Recent Activity */}
        <Section title="Recent Activity">
          {isLoading ? (
            <View>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className="mb-2">
                  <Skeleton height={48} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : recentActivity.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No recent activity.
              </Text>
            </Card>
          ) : (
            <View>
              {recentActivity.map((booking) => {
                const statusColors: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
                  pending: "warning",
                  confirmed: "info",
                  completed: "success",
                  cancelled: "error",
                  no_show: "error",
                };

                return (
                  <Card key={booking._id} className="mb-2">
                    <Row justify="between" align="center">
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                          numberOfLines={1}
                        >
                          {booking.customerName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {booking.serviceName} -{" "}
                          {formatRelativeTime(booking.createdAt)}
                        </Text>
                      </View>
                      <Badge
                        label={booking.status}
                        variant={statusColors[booking.status] ?? "default"}
                      />
                    </Row>
                  </Card>
                );
              })}
            </View>
          )}
        </Section>

        <Spacer size={20} />
      </ScrollView>
    </Screen>
  );
}
