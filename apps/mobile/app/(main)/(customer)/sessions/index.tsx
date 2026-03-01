import React from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Dumbbell, User, Calendar } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useSessionLogs, useSessionCredits } from "@timeo/api-client";
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

function formatSessionDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
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
  const tenantId = activeTenantId as string;

  const { data: sessions, isLoading, refetch, isRefetching } = useSessionLogs(tenantId);
  const { data: credits } = useSessionCredits(tenantId);

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

  if (isLoading) {
    return <LoadingScreen message="Loading sessions..." />;
  }

  const totalRemaining = credits?.reduce((sum, c) => sum + c.remaining, 0) ?? 0;
  const totalPackages = credits?.length ?? 0;

  return (
    <Screen padded={false}>
      <Header title="My Sessions" onBack={() => router.back()} />

      {/* Credit Balance */}
      {credits && credits.length > 0 && (
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
                  {totalRemaining}
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
                  {totalPackages} package{totalPackages !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Session List */}
      <FlatList
        data={sessions ?? []}
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
            title="No sessions yet"
            description="Your training sessions will appear here after your coach logs them."
            icon={<Dumbbell size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/sessions/${item.id}` as any)}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                {item.sessionType && (
                  <View className="flex-row items-center">
                    <Badge label={formatSessionType(item.sessionType)} />
                  </View>
                )}
                <Spacer size={8} />
                {item.coachName && (
                  <View className="flex-row items-center">
                    <User size={14} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1.5 text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      {item.coachName}
                    </Text>
                  </View>
                )}
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
