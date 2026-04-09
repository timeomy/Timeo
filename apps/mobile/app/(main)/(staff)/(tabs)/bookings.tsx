import { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Clock3,
  Users,
  UserRound,
  CheckCircle2,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useCoachSchedule } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Badge,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export default function CoachScheduleTab() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const {
    data: schedule,
    isLoading,
    refetch,
    isRefetching,
  } = useCoachSchedule(tenantId);

  const { todayItems, upcomingItems } = useMemo(() => {
    const now = Date.now();
    const list = (schedule ?? []).filter((item) => {
      if (!item.startAt) return false;
      const timestamp = new Date(item.startAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= now - 24 * 60 * 60 * 1000;
    });

    return {
      todayItems: list.filter((item) => isToday(item.startAt)),
      upcomingItems: list.filter((item) => !isToday(item.startAt)),
    };
  }, [schedule]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Schedule" />
        <EmptyState
          title="No organization selected"
          description="Please select an organization first."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Coach Schedule" />

      <FlatList
        data={upcomingItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          gap: 10,
        }}
        ListHeaderComponent={
          <View className="pt-4" style={{ gap: 12 }}>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  Today&apos;s Schedule
                </Text>
                <Badge label={`${todayItems.length} items`} />
              </View>

              {todayItems.length === 0 ? (
                <Text className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                  No sessions scheduled for today.
                </Text>
              ) : (
                <View className="mt-3" style={{ gap: 8 }}>
                  {todayItems.map((item) => (
                    <View key={item.id} className="rounded-xl px-3 py-2" style={{ backgroundColor: theme.colors.surface }}>
                      <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        {item.title}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {formatDateTime(item.startAt)}
                      </Text>
                      {item.clientName ? (
                        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          Client: {item.clientName}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <View className="flex-row" style={{ gap: 10 }}>
              <Button onPress={() => router.push("/session-logs/create" as never)}>
                Log Session
              </Button>
              <Button variant="outline" onPress={() => router.push("/session-logs" as never)}>
                Session History
              </Button>
            </View>

            <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
              Upcoming
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No upcoming sessions"
            description="New bookings and classes will show here once scheduled."
            icon={<CalendarDays size={30} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  {item.title}
                </Text>
                <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                  <Clock3 size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {formatDateTime(item.startAt)}
                  </Text>
                </View>

                {item.source === "coach_booking" && item.clientName ? (
                  <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                    <UserRound size={13} color={theme.colors.textSecondary} />
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {item.clientName}
                    </Text>
                  </View>
                ) : null}

                {item.source === "group_class" ? (
                  <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                    <Users size={13} color={theme.colors.textSecondary} />
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {item.attendedCount ?? 0}/{item.enrolledCount ?? 0} attended
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="items-end" style={{ gap: 8 }}>
                {item.status ? <Badge label={item.status} /> : null}
                {item.source === "group_class" && item.classId ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/attendance/${item.classId}` as never)
                    }
                  >
                    <View
                      className="rounded-full px-2 py-1"
                      style={{ backgroundColor: theme.colors.primary + "20" }}
                    >
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <CheckCircle2 size={12} color={theme.colors.primary} />
                        <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                          Attendance
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
