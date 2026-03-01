import { useMemo } from "react";
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
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { useBookings, useOrders } from "@timeo/api-client";
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
  const tenantId = activeTenantId as string;

  const {
    data: bookings,
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
    isRefetching: isRefetchingBookings,
  } = useBookings(tenantId);

  const {
    data: orders,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
    isRefetching: isRefetchingOrders,
  } = useOrders(tenantId);

  const stats = useMemo(() => {
    if (!bookings || !orders) {
      return { bookingsToday: 0, pendingBookings: 0, completedBookings: 0, pendingOrders: 0 };
    }
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const todaysBookings = bookings.filter((b) => {
      const t = new Date(b.startTime).getTime();
      return t >= startOfDay && t < endOfDay;
    });

    return {
      bookingsToday: todaysBookings.length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
    };
  }, [bookings, orders]);

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    const now = Date.now();
    return bookings
      .filter(
        (b) =>
          new Date(b.startTime).getTime() > now &&
          (b.status === "pending" || b.status === "confirmed")
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [bookings]);

  const recentPendingOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => o.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

  if (isLoadingBookings || isLoadingOrders) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const greeting = user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Dashboard";

  const handleRefresh = () => {
    refetchBookings();
    refetchOrders();
  };

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingBookings || isRefetchingOrders}
            onRefresh={handleRefresh}
          />
        }
      >
        <View className="flex-row items-center justify-between pb-2 pt-4">
          <View className="flex-1">
            <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
              {greeting}
            </Text>
            {activeTenant ? (
              <Text className="mt-0.5 text-sm" style={{ color: theme.colors.textSecondary }}>
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

        <Section title="Quick Actions">
          <View style={{ gap: 8 }}>
            {[
              { route: "/check-ins/", icon: QrCode, color: theme.colors.success, label: "Check-ins", desc: "QR scan & manual check-in" },
              { route: "/session-logs/", icon: Dumbbell, color: theme.colors.info, label: "Session Logs", desc: "Log & track client sessions" },
              { route: "/gift-cards/redeem", icon: CreditCard, color: theme.colors.warning, label: "Gift Card", desc: "Redeem gift card balance" },
              { route: "/pos/", icon: DollarSign, color: theme.colors.primary, label: "Point of Sale", desc: "Process transactions" },
              { route: "/services/", icon: Wrench, color: theme.colors.info, label: "Services", desc: "Manage service offerings" },
              { route: "/schedule/", icon: CalendarClock, color: theme.colors.warning, label: "My Schedule", desc: "View & manage your schedule" },
              { route: "/notifications/", icon: Bell, color: theme.colors.error, label: "Notifications", desc: "View alerts & messages" },
            ].map((action) => (
              <TouchableOpacity
                key={action.route}
                onPress={() => router.push(action.route as any)}
                className="flex-row items-center rounded-2xl p-4"
                style={{ backgroundColor: theme.colors.surface }}
                activeOpacity={0.7}
              >
                <View
                  className="mr-3 rounded-lg p-2"
                  style={{ backgroundColor: action.color + "15" }}
                >
                  <action.icon size={20} color={action.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                    {action.label}
                  </Text>
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {action.desc}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section
          title="Upcoming Bookings"
          seeAll={{ onPress: () => router.push("/(tabs)/bookings") }}
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
                  key={booking.id}
                  serviceName={booking.serviceName}
                  staffName={booking.staffName}
                  status={booking.status}
                  startTime={new Date(booking.startTime).getTime()}
                  duration={Math.round(
                    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (60 * 1000)
                  )}
                  onPress={() => router.push(`/bookings/${booking.id}`)}
                />
              ))}
            </View>
          )}
        </Section>

        <Section
          title="Pending Orders"
          seeAll={{ onPress: () => router.push("/(tabs)/orders") }}
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
                  key={order.id}
                  orderNumber={order.id.slice(-6).toUpperCase()}
                  status={order.status}
                  totalAmount={order.totalAmount}
                  currency={order.currency}
                  itemCount={order.itemCount}
                  createdAt={new Date(order.createdAt).getTime()}
                  onPress={() => router.push(`/orders/${order.id}`)}
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
