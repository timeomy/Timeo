import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  ClipboardList,
  LogOut,
} from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  StatCard,
  BookingCard,
  OrderCard,
  Section,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import type { Id } from "@timeo/api";

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user, activeOrg, signOut } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as Id<"tenants"> | null;

  const bookings = useQuery(
    api.bookings.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const orders = useQuery(
    api.orders.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries auto-refresh; the RefreshControl gives visual feedback
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Compute today's stats
  const stats = useMemo(() => {
    if (!bookings || !orders) {
      return {
        bookingsToday: 0,
        pendingBookings: 0,
        completedBookings: 0,
        pendingOrders: 0,
      };
    }

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const todaysBookings = bookings.filter(
      (b) => b.startTime >= startOfDay && b.startTime < endOfDay
    );

    return {
      bookingsToday: todaysBookings.length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
    };
  }, [bookings, orders]);

  // Upcoming bookings: next 5 future bookings that are pending/confirmed
  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    const now = Date.now();
    return bookings
      .filter(
        (b) =>
          b.startTime > now &&
          (b.status === "pending" || b.status === "confirmed")
      )
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5);
  }, [bookings]);

  // Pending orders: most recent 5
  const recentPendingOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => o.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [orders]);

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

  if (bookings === undefined || orders === undefined) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const greeting = user?.firstName ? `Hi, ${user.firstName}` : "Dashboard";

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header area */}
        <View className="flex-row items-center justify-between pb-2 pt-4">
          <View className="flex-1">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {greeting}
            </Text>
            {activeOrg ? (
              <Text
                className="mt-0.5 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {activeOrg.name}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => signOut()}
            className="rounded-full p-2"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <LogOut size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Spacer size={16} />

        {/* Stats Grid */}
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <View className="flex-1" style={{ minWidth: "45%" }}>
            <StatCard
              label="Bookings Today"
              value={stats.bookingsToday}
              icon={<CalendarDays size={18} color={theme.colors.primary} />}
            />
          </View>
          <View className="flex-1" style={{ minWidth: "45%" }}>
            <StatCard
              label="Pending"
              value={stats.pendingBookings}
              icon={<Clock size={18} color={theme.colors.warning} />}
            />
          </View>
          <View className="flex-1" style={{ minWidth: "45%" }}>
            <StatCard
              label="Completed"
              value={stats.completedBookings}
              icon={<CheckCircle size={18} color={theme.colors.success} />}
            />
          </View>
          <View className="flex-1" style={{ minWidth: "45%" }}>
            <StatCard
              label="Pending Orders"
              value={stats.pendingOrders}
              icon={<ClipboardList size={18} color={theme.colors.error} />}
            />
          </View>
        </View>

        {/* Upcoming Bookings */}
        <Section
          title="Upcoming Bookings"
          seeAll={{
            onPress: () => router.push("/(tabs)/bookings"),
          }}
        >
          {upcomingBookings.length === 0 ? (
            <EmptyState
              title="No upcoming bookings"
              description="All clear for now."
              icon={<CalendarDays size={32} color={theme.colors.textSecondary} />}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  serviceName={booking.serviceName}
                  staffName={booking.staffName}
                  status={booking.status}
                  startTime={booking.startTime}
                  duration={Math.round(
                    (booking.endTime - booking.startTime) / (60 * 1000)
                  )}
                  onPress={() => router.push(`/bookings/${booking._id}`)}
                />
              ))}
            </View>
          )}
        </Section>

        {/* Pending Orders */}
        <Section
          title="Pending Orders"
          seeAll={{
            onPress: () => router.push("/(tabs)/orders"),
          }}
        >
          {recentPendingOrders.length === 0 ? (
            <EmptyState
              title="No pending orders"
              description="All orders are up to date."
              icon={<ClipboardList size={32} color={theme.colors.textSecondary} />}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {recentPendingOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  orderNumber={order._id.slice(-6).toUpperCase()}
                  status={order.status}
                  totalAmount={order.totalAmount}
                  currency={order.currency}
                  itemCount={order.itemCount}
                  createdAt={order.createdAt}
                  onPress={() => router.push(`/orders/${order._id}`)}
                />
              ))}
            </View>
          )}
        </Section>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
