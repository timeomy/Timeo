import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Users, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useStaffMembers } from "@timeo/api-client";
import {
  Screen,
  Header,
  SearchInput,
  Avatar,
  Badge,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

type RoleFilter = "all" | "admin" | "staff" | "customer";

const ROLE_FILTERS: { label: string; value: RoleFilter }[] = [
  { label: "All", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

const ROLE_BADGE_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  admin: "info",
  staff: "default",
  customer: "success",
  platform_admin: "warning",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function AdminStaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const { data: members, isLoading, refetch, isRefetching } = useStaffMembers(tenantId);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = members;
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
    }
    return result;
  }, [members, roleFilter, search]);

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading staff..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title="Staff"
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/staff/invite" as any)}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
          </TouchableOpacity>
        }
      />

      <View className="px-4 pb-3">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search staff..." />
      </View>

      {/* Role Filter */}
      <View className="flex-row px-4 pb-3" style={{ gap: 8 }}>
        {ROLE_FILTERS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setRoleFilter(opt.value)}
            className="rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                roleFilter === opt.value
                  ? theme.colors.primary + "20"
                  : theme.colors.surface,
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color:
                  roleFilter === opt.value
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No staff found"
            description={search ? "Try a different search." : "Invite team members to get started."}
            icon={<Users size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/staff/${item.id}` as any)}
            activeOpacity={0.7}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-center">
              <Avatar fallback={getInitials(item.name)} size="md" />
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>
              </View>
              <Badge
                label={item.role}
                variant={ROLE_BADGE_VARIANTS[item.role] ?? "default"}
              />
            </View>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
