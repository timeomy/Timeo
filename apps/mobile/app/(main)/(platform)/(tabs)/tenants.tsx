import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Building2, Plus } from "lucide-react-native";
import { usePlatformTenants } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  SearchInput,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function getPlanVariant(plan: string): "default" | "success" | "warning" | "error" {
  switch (plan) {
    case "enterprise":
      return "success";
    case "pro":
      return "default";
    case "starter":
      return "warning";
    default:
      return "error";
  }
}

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "trial":
      return "warning";
    case "suspended":
      return "error";
    default:
      return "default";
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PlatformTenantsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: tenants, isLoading, refetch, isRefetching } = usePlatformTenants();

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!search.trim()) return tenants;
    const query = search.toLowerCase().trim();
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query),
    );
  }, [tenants, search]);

  if (isLoading) {
    return <LoadingScreen message="Loading tenants..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title="Tenants"
        rightActions={
          <TouchableOpacity onPress={() => router.push("/tenants/new" as never)}>
            <Plus size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      <View className="px-4 pb-2">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search tenants..." />
        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredTenants.length} tenant{filteredTenants.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No tenants found"
            description={search.trim() ? "Try a different search term." : "Create your first tenant to get started."}
            icon={<Building2 size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/tenants/${item.id}` as never)}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
                  {item.name}
                </Text>
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  /{item.slug}
                </Text>
                <View className="mt-1.5 flex-row" style={{ gap: 6 }}>
                  <Badge label={item.plan} variant={getPlanVariant(item.plan)} />
                  <Badge label={item.status} variant={getStatusVariant(item.status)} />
                </View>
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.memberCount} member{item.memberCount !== 1 ? "s" : ""} · Created {formatDate(item.createdAt)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold" style={{ color: theme.colors.success }}>
                  RM {(item.mrr / 100).toFixed(2)}
                </Text>
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  MRR
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
