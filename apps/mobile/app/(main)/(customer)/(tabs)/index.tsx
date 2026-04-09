import { useMemo } from "react";
import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  DoorOpen,
  QrCode,
  Receipt,
  UserRound,
  Wallet,
} from "lucide-react-native";
import {
  useMemberQrCode,
  useMyBookings,
  useMyCheckInHistory,
  useMyMembershipSubscriptions,
  useSessionCredits,
} from "@timeo/api-client";
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { Avatar, Card, Screen, Spacer, useTheme } from "@timeo/ui";

type SubscriptionRow = {
  subscription?: {
    currentPeriodEnd?: string;
    current_period_end?: string;
  };
  plan?: {
    name?: string | null;
  };
};

type TimelineItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  kind: "check-in" | "class";
};

function getSubscriptionEndDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodEnd ?? row?.subscription?.current_period_end ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value: string) {
  const date = new Date(value).getTime();
  const diffMinutes = Math.floor((Date.now() - date) / 60000);

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatCheckInMethod(method?: string) {
  if (!method) return "Unknown";
  if (method === "nfc") return "Card";
  return method.toUpperCase();
}

function getMembershipState(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return { label: "Pending", color: "#88878F" };
  }

  if (daysRemaining <= 0) {
    return { label: "Expired", color: "#EF4444" };
  }

  if (daysRemaining <= 7) {
    return { label: "Expiring Soon", color: "#F59E0B" };
  }

  return { label: "Active", color: "#10B981" };
}

export default function CustomerHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, activeTenantId } = useTimeoAuth();
  const { activeTenant } = useTenantSwitcher();

  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useMyMembershipSubscriptions(activeTenantId);
  const { data: sessionCredits = [] } = useSessionCredits(activeTenantId);
  const { data: checkInHistory, isLoading: checkInsLoading } =
    useMyCheckInHistory(activeTenantId, {
      page: 1,
      limit: 5,
    });
  const { data: myBookings = [], isLoading: bookingsLoading } =
    useMyBookings(activeTenantId);
  const { data: qrCode, isLoading: qrLoading } = useMemberQrCode(activeTenantId);

  const firstName = user?.name?.split(" ")[0] ?? "Member";
  const displayName = user?.name ?? user?.email ?? "Member";
  const tenantName = activeTenant?.name ?? "Your Gym";

  const sortedSubscriptions = useMemo(
    () =>
      [...(subscriptions as SubscriptionRow[])].sort((left, right) => {
        const leftDate = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
        const rightDate = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
        return rightDate - leftDate;
      }),
    [subscriptions],
  );

  const latestSubscription = sortedSubscriptions[0] ?? null;
  const planName = latestSubscription?.plan?.name ?? "No active plan";
  const periodEnd = getSubscriptionEndDate(latestSubscription);

  const daysRemaining = useMemo(() => {
    if (!periodEnd) return null;
    const dayMs = 86_400_000;
    return Math.ceil((new Date(periodEnd).getTime() - Date.now()) / dayMs);
  }, [periodEnd]);

  const sessionBalance = useMemo(
    () =>
      sessionCredits.reduce(
        (total, credit) => total + Math.max(0, credit.remaining ?? 0),
        0,
      ),
    [sessionCredits],
  );

  const recentTimeline = useMemo<TimelineItem[]>(() => {
    const checkIns = (checkInHistory?.items ?? []).map((item) => ({
      id: `check-in-${item.id}`,
      kind: "check-in" as const,
      timestamp: item.checkedInAt,
      title: "Gym check-in",
      detail: `${formatCheckInMethod(item.method)} scan • ${formatDateTime(item.checkedInAt)}`,
    }));

    const classes = myBookings.map((booking) => {
      const isUpcoming = new Date(booking.startTime).getTime() > Date.now();
      const title = isUpcoming
        ? "Class booking"
        : booking.status === "completed"
          ? "Class attended"
          : "Booking update";

      return {
        id: `booking-${booking.id}`,
        kind: "class" as const,
        timestamp: booking.startTime,
        title,
        detail: `${booking.serviceName ?? "Class"} • ${formatDateTime(booking.startTime)}`,
      };
    });

    return [...checkIns, ...classes]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      )
      .slice(0, 5);
  }, [checkInHistory?.items, myBookings]);

  const membershipState = getMembershipState(daysRemaining);
  const isTimelineLoading = checkInsLoading || bookingsLoading;

  const quickActions: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: typeof QrCode;
    route: string;
    color: string;
  }> = [
    {
      id: "qr",
      title: "My QR Code",
      subtitle: qrLoading ? "Loading" : qrCode?.code ? "Ready to scan" : "Generate now",
      icon: QrCode,
      route: "/(main)/(customer)/qr-code",
      color: theme.colors.success,
    },
    {
      id: "book",
      title: "Book a Class",
      subtitle: "Reserve now",
      icon: Calendar,
      route: "/(main)/(customer)/(tabs)/services",
      color: theme.colors.info,
    },
    {
      id: "plan",
      title: "My Plan",
      subtitle: `${sessionBalance} credit${sessionBalance === 1 ? "" : "s"}`,
      icon: Wallet,
      route: "/(main)/(customer)/(tabs)/membership",
      color: "#8B5CF6",
    },
    {
      id: "activity",
      title: "Activity",
      subtitle: "Bookings & visits",
      icon: CheckCircle2,
      route: "/(main)/(customer)/(tabs)/bookings",
      color: theme.colors.primary,
    },
    {
      id: "history",
      title: "Check-ins",
      subtitle: "Visit history",
      icon: DoorOpen,
      route: "/(main)/(customer)/checkin-history",
      color: theme.colors.warning,
    },
    {
      id: "profile",
      title: "Profile",
      subtitle: "Account settings",
      icon: UserRound,
      route: "/(main)/(customer)/(tabs)/profile",
      color: "#F43F5E",
    },
  ];

  return (
    <Screen scroll>
      <Card className="mt-4" style={{ backgroundColor: theme.colors.primary + "20" }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: theme.colors.textSecondary }}
            >
              Welcome Back
            </Text>
            <Text
              className="mt-1 text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {firstName}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
              {tenantName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(main)/(customer)/qr-code" as never)}
            className="h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.colors.background + "70" }}
          >
            <QrCode size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </Card>

      <Spacer size={16} />

      <Card>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: theme.colors.textSecondary }}
            >
              Membership Status
            </Text>
            <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
              {subscriptionsLoading ? "Loading..." : planName}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
              {daysRemaining === null
                ? "Waiting for your subscription details"
                : `${Math.max(daysRemaining, 0)} day${daysRemaining === 1 ? "" : "s"} remaining`}
            </Text>
          </View>

          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: membershipState.color + "20" }}
          >
            <Text className="text-xs font-semibold" style={{ color: membershipState.color }}>
              {membershipState.label}
            </Text>
          </View>
        </View>

        <Spacer size={12} />

        <View className="flex-row items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: theme.colors.background + "70" }}
        >
          <View>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              Session Credits
            </Text>
            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
              {sessionBalance}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              QR Status
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: qrCode?.code ? theme.colors.success : theme.colors.warning }}
            >
              {qrCode?.code ? "Ready" : "Needs setup"}
            </Text>
          </View>
        </View>
      </Card>

      <Spacer size={20} />

      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
          Quick Actions
        </Text>
      </View>

      <Spacer size={10} />

      <View className="flex-row flex-wrap justify-between">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <TouchableOpacity
              key={action.id}
              onPress={() => router.push(action.route as never)}
              className="mb-3 w-[48%] rounded-2xl border p-3"
              style={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: action.color + "20" }}
              >
                <Icon size={20} color={action.color} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: theme.colors.text }}>
                {action.title}
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Spacer size={12} />

      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
          Recent Activity
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(main)/(customer)/(tabs)/bookings" as never)}
        >
          <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      <Spacer size={10} />

      <Card>
        {isTimelineLoading ? (
          <View className="py-4">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
              Loading activity...
            </Text>
          </View>
        ) : recentTimeline.length === 0 ? (
          <View className="items-center py-6">
            <DoorOpen size={26} color={theme.colors.textSecondary + "80"} />
            <Text className="mt-2 text-sm font-semibold" style={{ color: theme.colors.text }}>
              No activity yet
            </Text>
            <Text
              className="mt-1 text-center text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Your check-ins and class visits will appear here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(main)/(customer)/(tabs)/services" as never)}
              className="mt-4 rounded-xl px-4 py-2"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="font-semibold" style={{ color: "#0B0B0F" }}>
                Book first class
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTimeline.map((item, index) => (
            <View
              key={item.id}
              className={`flex-row items-start py-3 ${
                index < recentTimeline.length - 1 ? "border-b" : ""
              }`}
              style={{ borderColor: theme.colors.border }}
            >
              <View
                className="mr-3 h-8 w-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    item.kind === "check-in"
                      ? theme.colors.success + "20"
                      : theme.colors.info + "20",
                }}
              >
                {item.kind === "check-in" ? (
                  <DoorOpen size={15} color={theme.colors.success} />
                ) : (
                  <Receipt size={15} color={theme.colors.info} />
                )}
              </View>

              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.detail}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Clock3 size={11} color={theme.colors.textSecondary} />
                <Text className="ml-1 text-[11px]" style={{ color: theme.colors.textSecondary }}>
                  {formatRelative(item.timestamp)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Spacer size={16} />

      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Avatar src={user?.imageUrl} fallback={displayName} size="sm" />
            <View className="ml-3">
              <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {displayName}
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Member ID: {user?.id?.slice(0, 8).toUpperCase() ?? "MEMBER"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(main)/(customer)/(tabs)/profile" as never)}
          >
            <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
              Manage
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Screen>
  );
}
