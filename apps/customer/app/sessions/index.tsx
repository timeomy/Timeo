import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Dumbbell, User, Calendar } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  LoadingScreen,
  EmptyState,
  Spacer,
  useTheme,
} from "@timeo/ui";

function formatSessionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSessionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function SessionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const sessions = useQuery(
    api.sessionLogs.listByClient,
    tenantId ? { tenantId } : "skip"
  );

  const balance = useQuery(
    api.sessionCredits.getBalance,
    tenantId ? { tenantId } : "skip"
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="My Sessions" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (sessions === undefined) {
    return <LoadingScreen message="Loading sessions..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="My Sessions" onBack={() => router.back()} />

      {/* Credit Balance */}
      {balance && (
        <View className="px-4 pb-3">
          <Card>
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Sessions Remaining
                </Text>
                <Text
                  className="text-2xl font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  {balance.totalRemaining}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.primary }}
                >
                  {balance.packages} package{balance.packages !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Session List */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          gap: 10,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No sessions yet"
            description="Your training sessions will appear here after your coach logs them."
            icon={<Dumbbell size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/sessions/${item._id}` as any)}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Badge label={formatSessionType(item.sessionType)} />
                  </View>
                  <Spacer size={8} />
                  <View className="flex-row items-center">
                    <User size={14} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1.5 text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      {item.coachName}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1.5 text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {formatSessionDate(item.createdAt)}
                    </Text>
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
                      {item.exercises.length} exercise
                      {item.exercises.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
          </Card>
        )}
      />
    </Screen>
  );
}
