import { useState, useMemo } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { Users } from "lucide-react-native";
import { usePlatformUsers } from "@timeo/api-client";
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PlatformClientsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const { data: users, isLoading, refetch, isRefetching } = usePlatformUsers();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const query = search.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  if (isLoading) {
    return <LoadingScreen message="Loading users..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Users" />

      <View className="px-4 pb-2">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search by name or email..." />
        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No users found"
            description={search.trim() ? "Try a different search term." : "No users have signed up yet."}
            icon={<Users size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: theme.colors.primary + "20",
                }}
              >
                <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
                  {getInitials(item.name)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                  {item.name}
                </Text>
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.email}
                </Text>
                <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                  <Badge label={item.role} variant="default" />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {item.tenantCount} tenant{item.tenantCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Badge
                  label={item.status}
                  variant={item.status === "active" ? "success" : "warning"}
                />
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
