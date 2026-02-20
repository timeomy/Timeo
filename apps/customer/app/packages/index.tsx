import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Package, Clock } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
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

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "No expiry";
  return new Date(timestamp).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PackagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const credits = useQuery(
    api.sessionCredits.getByUser,
    tenantId ? { tenantId } : "skip"
  );

  if (!tenantId) {
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

  if (credits === undefined) {
    return <LoadingScreen message="Loading packages..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="My Packages" onBack={() => router.back()} />

      <FlatList
        data={credits}
        keyExtractor={(item) => item._id}
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
            item.totalSessions > 0
              ? remaining / item.totalSessions
              : 0;
          const isExpired = item.expiresAt ? item.expiresAt < Date.now() : false;
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
                    {item.packageName}
                  </Text>
                  <View className="mt-1 flex-row items-center" style={{ gap: 8 }}>
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
                      {isExpired ? "Expired" : `Expires ${formatDate(item.expiresAt)}`}
                    </Text>
                  </View>
                </View>
                <View
                  className="rounded-full px-2 py-1"
                  style={{
                    backgroundColor: isExpired || isExhausted
                      ? theme.colors.error + "15"
                      : theme.colors.success + "15",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isExpired || isExhausted
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
