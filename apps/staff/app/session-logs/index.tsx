import { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import {
  Dumbbell,
  User,
  Calendar,
  Plus,
} from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  SearchInput,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function formatSessionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatSessionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function SessionLogsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any;
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const sessionLogs = useQuery(
    api.sessionLogs.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const filteredLogs = useMemo(() => {
    if (!sessionLogs) return [];
    if (!searchQuery.trim()) return sessionLogs;
    const q = searchQuery.toLowerCase();
    return sessionLogs.filter(
      (log) =>
        log.clientName.toLowerCase().includes(q) ||
        log.coachName.toLowerCase().includes(q)
    );
  }, [sessionLogs, searchQuery]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Session Logs" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (sessionLogs === undefined) {
    return <LoadingScreen message="Loading session logs..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Session Logs" onBack={() => router.back()} />

      <View className="px-4 pb-2">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by client or coach..."
        />
      </View>

      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          {filteredLogs.length} session{filteredLogs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          paddingTop: 8,
          gap: 10,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No session logs"
            description="Session logs will appear here when you create them."
            icon={<Dumbbell size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  {item.clientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {item.clientName}
                </Text>
                <View className="mt-1 flex-row items-center" style={{ gap: 8 }}>
                  <Badge label={formatSessionType(item.sessionType)} />
                </View>
                <View className="mt-2 flex-row items-center" style={{ gap: 12 }}>
                  <View className="flex-row items-center">
                    <User size={12} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1 text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {item.coachName}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Calendar size={12} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1 text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {formatSessionDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
              {item.exercises && item.exercises.length > 0 && (
                <View
                  className="rounded-full px-2 py-1"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {item.exercises.length}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/session-logs/create" as any)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: theme.colors.primary }}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
      </TouchableOpacity>
    </Screen>
  );
}
