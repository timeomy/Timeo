import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  ClipboardList,
  LogOut,
  QrCode,
  Dumbbell,
  CreditCard,
  DollarSign,
  ChevronRight,
  CalendarClock,
  Bell,
  Wrench,
} from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
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
export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user, signOut } = useTimeoAuth();
  const { activeTenant } = useTenantSwitcher();
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as any;

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

  const greeting = user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Dashboard";

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
            {activeTenant ? (
              <Text
                className="mt-0.5 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {activeTenant.name}
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

        {/* Quick Actions */}
        <Section title="Quick Actions">
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/check-ins/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.success + "15" }}
              >
                <QrCode size={20} color={theme.colors.success} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Check-ins
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  QR scan & manual check-in
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/session-logs/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.info + "15" }}
              >
                <Dumbbell size={20} color={theme.colors.info} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Session Logs
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Log & track client sessions
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/gift-cards/redeem" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.warning + "15" }}
              >
                <CreditCard size={20} color={theme.colors.warning} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Gift Card
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Redeem gift card balance
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/pos/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <DollarSign size={20} color={theme.colors.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Point of Sale
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Process transactions
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/services/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.info + "15" }}
              >
                <Wrench size={20} color={theme.colors.info} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Services
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Manage service offerings
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/schedule/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.warning + "15" }}
              >
                <CalendarClock size={20} color={theme.colors.warning} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  My Schedule
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  View & manage your schedule
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/notifications/" as any)}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.error + "15" }}
              >
                <Bell size={20} color={theme.colors.error} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Notifications
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  View alerts & messages
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Section>

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
