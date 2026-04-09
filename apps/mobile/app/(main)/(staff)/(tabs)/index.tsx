import { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Clock3,
  Dumbbell,
  QrCode,
  UserCircle2,
} from "lucide-react-native";
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { useCoachClients } from "@timeo/api-client";
import {
  Screen,
  Card,
  Button,
  EmptyState,
  LoadingScreen,
  StatCard,
  useTheme,
} from "@timeo/ui";

function formatLastSession(date: string | null): string {
  if (!date) return "No sessions yet";

  return new Date(date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function getPlanStatusText(client: {
  planStatus: string | null;
  remainingClasses: number | null;
  planName: string | null;
}): string {
  if (typeof client.remainingClasses === "number") {
    return `${client.remainingClasses} classes left`;
  }

  if (client.planStatus) {
    return client.planStatus.replace(/_/g, " ");
  }

  if (client.planName) {
    return client.planName;
  }

  return "No active package";
}

export default function CoachClientsTab() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, activeRole } = useTimeoAuth();
  const { activeTenant } = useTenantSwitcher();
  const tenantId = activeTenantId as string;
  const isCoach = activeRole === "coach";

  const {
    data: clients,
    isLoading,
    refetch,
    isRefetching,
  } = useCoachClients(tenantId);

  const stats = useMemo(() => {
    const list = clients ?? [];

    const activePlanCount = list.filter(
      (client) => client.planStatus === "active",
    ).length;

    const overdueCount = list.filter((client) => {
      const days = daysSince(client.lastSessionDate);
      return days !== null && days >= 10;
    }).length;

    return {
      total: list.length,
      activePlanCount,
      overdueCount,
    };
  }, [clients]);

  if (!tenantId) {
    return (
      <Screen>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to view clients."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading clients..." />;
  }

  return (
    <Screen padded={false}>
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          {isCoach ? "My Clients" : "Coach Clients"}
        </Text>
        {activeTenant ? (
          <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
            {activeTenant.name}
          </Text>
        ) : null}
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1">
            <StatCard
              label="Total Clients"
              value={stats.total}
              icon={<UserCircle2 size={16} color={theme.colors.primary} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Active Plans"
              value={stats.activePlanCount}
              icon={<Dumbbell size={16} color={theme.colors.success} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Need Follow-up"
              value={stats.overdueCount}
              icon={<Clock3 size={16} color={theme.colors.warning} />}
            />
          </View>
        </View>
      </View>

      <View className="px-4 pb-4">
        <View className="flex-row" style={{ gap: 10 }}>
          <Button onPress={() => router.push("/session-logs/create" as never)}>
            Log Session
          </Button>
          <Button variant="outline" onPress={() => router.push("/session-logs" as never)}>
            History
          </Button>
          <Button variant="outline" onPress={() => router.push("/scanner" as never)}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <QrCode size={14} color={theme.colors.primary} />
              <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                Scan
              </Text>
            </View>
          </Button>
        </View>
      </View>

      <FlatList
        data={clients ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          gap: 10,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No clients assigned yet"
            description="Assigned clients will appear here once linked to your coach profile."
            icon={<UserCircle2 size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => {
          const followUpDays = daysSince(item.lastSessionDate);
          const showFollowUp = followUpDays !== null && followUpDays >= 10;

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                router.push(
                  `/clients/${item.id}?name=${encodeURIComponent(item.name)}` as never,
                )
              }
            >
              <Card>
                <View className="flex-row items-center">
                  <View
                    className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.primary + "15" }}
                  >
                    <Text className="text-base font-bold" style={{ color: theme.colors.primary }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                      {item.name}
                    </Text>
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {item.email}
                    </Text>
                    <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: theme.colors.surface }}
                      >
                        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {getPlanStatusText(item)}
                        </Text>
                      </View>
                      {showFollowUp ? (
                        <View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: theme.colors.warning + "20" }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: theme.colors.warning }}>
                            Follow-up due
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center" style={{ gap: 6 }}>
                  <CalendarDays size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Last session: {formatLastSession(item.lastSessionDate)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}
