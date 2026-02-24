import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { Users } from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  SearchInput,
  EmptyState,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

export default function ClientsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const clients = useQuery(
    api.platform.listAllUsers,
    search.trim() ? { search } : {}
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (clients === undefined) {
    return <LoadingScreen message="Loading clients..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Clients" />

      <View className="px-4 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
        />
      </View>

      <FlatList
        data={clients}
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
          <EmptyState
            title={search.trim() ? "No clients found" : "No clients yet"}
            description={
              search.trim()
                ? `No users match "${search}"`
                : "Users will appear here once they register."
            }
            icon={<Users size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item: client }) => (
          <Card>
            <View className="flex-row items-center">
              {/* Avatar */}
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  {(
                    client.name?.[0] ??
                    client.email?.[0] ??
                    "?"
                  ).toUpperCase()}
                </Text>
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {client.name || "Unknown"}
                </Text>
                {client.email ? (
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {client.email}
                  </Text>
                ) : null}
                {client.tenantNames.length > 0 ? (
                  <Text
                    className="mt-0.5 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {client.tenantNames.join(" · ")}
                  </Text>
                ) : null}
              </View>

              {/* Membership count */}
              {client.membershipCount > 0 ? (
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: theme.colors.primary + "15" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.colors.primary }}
                  >
                    {client.membershipCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
