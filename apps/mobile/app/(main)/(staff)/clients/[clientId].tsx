import { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, Clock3, Dumbbell, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useCoachClients, useSessionLogs } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionType(type?: string): string {
  if (!type) return "Session";
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClientDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const { clientId, name } = useLocalSearchParams<{
    clientId: string;
    name?: string;
  }>();

  const tenantId = activeTenantId as string;

  const {
    data: clients,
    isLoading: loadingClients,
  } = useCoachClients(tenantId);

  const {
    data: sessionLogs,
    isLoading: loadingLogs,
    refetch,
    isRefetching,
  } = useSessionLogs(tenantId, {
    scope: "coach",
    clientId,
  });

  const client = useMemo(
    () => (clients ?? []).find((item) => item.id === clientId),
    [clients, clientId],
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Client Detail" onBack={() => router.back()} />
        <EmptyState
          title="No organization selected"
          description="Please select an organization first."
        />
      </Screen>
    );
  }

  if (loadingClients || loadingLogs) {
    return <LoadingScreen message="Loading client profile..." />;
  }

  return (
    <Screen padded={false}>
      <Header title={typeof name === "string" ? name : "Client"} onBack={() => router.back()} />

      <FlatList
        data={sessionLogs ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          gap: 10,
        }}
        ListHeaderComponent={
          <View className="pt-4" style={{ gap: 10 }}>
            <Card>
              <View className="flex-row items-center">
                <View
                  className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.primary + "15" }}
                >
                  <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                    {(client?.name ?? (name as string) ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                    {client?.name ?? name ?? "Client"}
                  </Text>
                  {client?.email ? (
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {client.email}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-3" style={{ gap: 6 }}>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Dumbbell size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Plan: {client?.planName ?? client?.planStatus ?? "No active package"}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Clock3 size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Remaining classes: {client?.remainingClasses ?? "-"}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <CalendarDays size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Last session: {formatDate(client?.lastSessionDate)}
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              onPress={() =>
                router.push(`/session-logs/create?clientId=${encodeURIComponent(clientId)}` as never)
              }
            >
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Plus size={14} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
                <Text style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}>
                  Log New Session
                </Text>
              </View>
            </Button>

            <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
              Session History ({sessionLogs?.length ?? 0})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No session history yet"
            description="Log the first session for this client to start tracking progress."
            icon={<Dumbbell size={28} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push(`/session-logs?clientId=${item.clientId}` as never)}
          >
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  {formatSessionType(item.sessionType)}
                </Text>
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.duration ? `${item.duration} min` : "-"}
                </Text>
              </View>

              <View className="mt-2" style={{ gap: 6 }}>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <CalendarDays size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                {item.notes ? (
                  <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
