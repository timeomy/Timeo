import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Building2, Plus, ChevronRight } from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Badge,
  SearchInput,
  EmptyState,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { formatDate, type TenantPlan, type TenantStatus } from "@timeo/shared";

function getPlanBadgeVariant(
  plan: string
): "default" | "info" | "success" | "warning" | "error" {
  switch (plan) {
    case "enterprise":
      return "warning";
    case "pro":
      return "success";
    case "starter":
      return "info";
    case "free":
    default:
      return "default";
  }
}

function getStatusBadgeVariant(
  status: string
): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
      return "error";
    case "trial":
      return "warning";
    default:
      return "default";
  }
}

export default function TenantsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const tenants = useQuery(api.tenants.list);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!search.trim()) return tenants;
    const query = search.toLowerCase().trim();
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query) ||
        t.plan.toLowerCase().includes(query)
    );
  }, [tenants, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (tenants === undefined) {
    return <LoadingScreen message="Loading tenants..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title="Tenants"
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/tenants/new")}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <View className="px-4 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tenants..."
        />
      </View>

      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <Spacer size={10} />}
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState
              title="No results found"
              description={`No tenants match "${search}"`}
              icon={<Building2 size={32} color={theme.colors.textSecondary} />}
            />
          ) : (
            <EmptyState
              title="No tenants yet"
              description="Create your first tenant to get started."
              icon={<Building2 size={32} color={theme.colors.textSecondary} />}
              action={{
                label: "Create Tenant",
                onPress: () => router.push("/tenants/new"),
              }}
            />
          )
        }
        renderItem={({ item: tenant }) => (
          <Card
            onPress={() =>
              router.push(`/tenants/${tenant._id}` as any)
            }
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text }}
                >
                  {tenant.name}
                </Text>
                <Text
                  className="mt-0.5 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  /{tenant.slug}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <Badge
                label={tenant.plan}
                variant={getPlanBadgeVariant(tenant.plan)}
              />
              <Badge
                label={tenant.status}
                variant={getStatusBadgeVariant(tenant.status)}
              />
            </View>

            <Text
              className="mt-2 text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Created {formatDate(tenant.createdAt)}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
