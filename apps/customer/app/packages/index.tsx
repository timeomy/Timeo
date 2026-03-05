import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Package, Clock } from "lucide-react-native";
import { useSessionCredits } from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  ProgressRing,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "No expiry";
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PackagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: credits, isLoading, refetch } = useSessionCredits(activeTenantId);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  if (!activeTenantId) {
    return (
      <Screen>
        <Header title="My Packages" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading packages..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="My Packages" onBack={() => router.back()} />

      <FlatList
        data={credits}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 8,
          gap: 12,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No packages"
            description="Session packages you purchase will appear here."
            icon={<Package size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => {
          const remaining = item.totalSessions - item.usedSessions;
          const progress =
            item.totalSessions > 0 ? remaining / item.totalSessions : 0;
          const isExpired = item.expiresAt
            ? new Date(item.expiresAt).getTime() < Date.now()
            : false;
          const isExhausted = remaining <= 0;

          return (
            <Card>
              <View className="flex-row items-center">
                <ProgressRing
                  progress={progress}
                  size={56}
                  strokeWidth={5}
                  color={
                    isExpired || isExhausted
                      ? theme.colors.error
                      : remaining <= 2
                        ? theme.colors.warning
                        : theme.colors.primary
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {item.packageName ?? "Package"}
                  </Text>
                  <View
                    className="mt-1 flex-row items-center"
                    style={{ gap: 8 }}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {remaining} / {item.totalSessions} remaining
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1 text-xs"
                      style={{
                        color: isExpired
                          ? theme.colors.error
                          : theme.colors.textSecondary,
                      }}
                    >
                      {isExpired
                        ? "Expired"
                        : `Expires ${formatDate(item.expiresAt)}`}
                    </Text>
                  </View>
                </View>
                <View
                  className="rounded-full px-2 py-1"
                  style={{
                    backgroundColor:
                      isExpired || isExhausted
                        ? theme.colors.error + "15"
                        : theme.colors.success + "15",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        isExpired || isExhausted
                          ? theme.colors.error
                          : theme.colors.success,
                    }}
                  >
                    {isExpired ? "Expired" : isExhausted ? "Used" : "Active"}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
