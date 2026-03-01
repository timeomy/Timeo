import { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Building2, TrendingUp, Plus, ClipboardList } from "lucide-react-native";
import { usePlatformStats, usePlatformTenants } from "@timeo/api-client";
import { Screen, Header, LoadingScreen, Spacer, useTheme } from "@timeo/ui";

function formatCurrency(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PlatformDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: statsRefetching } = usePlatformStats();
  const { data: tenants, isLoading: tenantsLoading, refetch: refetchTenants, isRefetching: tenantsRefetching } = usePlatformTenants();

  const topTenantsByRevenue = useMemo(() => {
    if (!tenants) return [];
    return [...tenants].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [tenants]);

  const recentTenants = useMemo(() => {
    if (!tenants) return [];
    return [...tenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [tenants]);

  const planDistribution = useMemo(() => {
    if (!tenants) return {};
    const dist: Record<string, number> = {};
    for (const t of tenants) {
      dist[t.plan] = (dist[t.plan] ?? 0) + 1;
    }
    return dist;
  }, [tenants]);

  const isLoading = statsLoading || tenantsLoading;
  const isRefetching = statsRefetching || tenantsRefetching;

  const handleRefresh = () => {
    refetchStats();
    refetchTenants();
  };

  if (isLoading) {
    return <LoadingScreen message="Loading platform dashboard..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Platform Dashboard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Overview Stats */}
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface, width: "48%" }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Building2 size={14} color={theme.colors.primary} />
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Total Tenants</Text>
            </View>
            <Text className="mt-1 text-2xl font-bold" style={{ color: theme.colors.text }}>
              {stats?.totalTenants ?? 0}
            </Text>
          </View>
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface, width: "48%" }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <TrendingUp size={14} color={theme.colors.success} />
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Active (30d)</Text>
            </View>
            <Text className="mt-1 text-2xl font-bold" style={{ color: theme.colors.text }}>
              {stats?.activeTenants30d ?? 0}
            </Text>
          </View>
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface, width: "48%" }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>MRR</Text>
            <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.success }}>
              {formatCurrency(stats?.mrr ?? 0)}
            </Text>
          </View>
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface, width: "48%" }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>ARR</Text>
            <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
              {formatCurrency(stats?.arr ?? 0)}
            </Text>
          </View>
        </View>

        <Spacer size={16} />

        {/* Growth */}
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>New Tenants (30d)</Text>
            <Text className="mt-1 text-lg font-bold" style={{ color: theme.colors.text }}>
              {stats?.newTenants30d ?? 0}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>Churn Rate (30d)</Text>
            <Text className="mt-1 text-lg font-bold" style={{ color: theme.colors.error }}>
              {((stats?.churnRate30d ?? 0) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <Spacer size={16} />

        {/* Plan Distribution */}
        {Object.keys(planDistribution).length > 0 && (
          <>
            <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
              Plan Distribution
            </Text>
            <Spacer size={8} />
            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
              {Object.entries(planDistribution).map(([plan, count]) => (
                <View key={plan} className="flex-row items-center justify-between py-1.5">
                  <Text className="text-sm font-medium capitalize" style={{ color: theme.colors.text }}>
                    {plan}
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
            <Spacer size={16} />
          </>
        )}

        {/* Top Tenants by Revenue */}
        {topTenantsByRevenue.length > 0 && (
          <>
            <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
              Top Tenants by Revenue
            </Text>
            <Spacer size={8} />
            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
              {topTenantsByRevenue.map((t, idx) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => router.push(`/tenants/${t.id}` as never)}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
                    <Text className="text-sm font-bold" style={{ color: theme.colors.textSecondary, width: 20 }}>
                      #{idx + 1}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: theme.colors.text }} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text className="text-xs capitalize" style={{ color: theme.colors.textSecondary }}>
                        {t.plan} · {t.memberCount} members
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold" style={{ color: theme.colors.success }}>
                    {formatCurrency(t.revenue)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Spacer size={16} />
          </>
        )}

        {/* Quick Actions */}
        <Text className="text-base font-bold" style={{ color: theme.colors.text }}>Quick Actions</Text>
        <Spacer size={8} />
        <View className="flex-row" style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push("/tenants/new" as never)}
            className="flex-1 flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.primary + "15", gap: 8 }}
          >
            <Plus size={18} color={theme.colors.primary} />
            <Text className="text-sm font-medium" style={{ color: theme.colors.primary }}>
              New Tenant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/logs" as never)}
            className="flex-1 flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface, gap: 8 }}
          >
            <ClipboardList size={18} color={theme.colors.textSecondary} />
            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
              Audit Logs
            </Text>
          </TouchableOpacity>
        </View>

        <Spacer size={16} />

        {/* Recent Tenants */}
        {recentTenants.length > 0 && (
          <>
            <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
              Recent Tenants
            </Text>
            <Spacer size={8} />
            {recentTenants.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => router.push(`/tenants/${t.id}` as never)}
                className="mb-2 rounded-2xl p-4"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {t.name}
                    </Text>
                    <Text className="text-xs capitalize" style={{ color: theme.colors.textSecondary }}>
                      {t.plan} · {t.status}
                    </Text>
                  </View>
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {formatDate(t.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
