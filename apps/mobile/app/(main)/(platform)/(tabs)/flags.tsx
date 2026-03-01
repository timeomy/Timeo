import { useState, useMemo } from "react";
import { View, Text, FlatList, Switch, RefreshControl } from "react-native";
import { Flag } from "lucide-react-native";
import { usePlatformFlags, useUpdatePlatformFlag } from "@timeo/api-client";
import {
  Screen,
  Header,
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

export default function PlatformFlagsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  const { data: flags, isLoading, refetch, isRefetching } = usePlatformFlags();
  const updateFlag = useUpdatePlatformFlag();

  const filteredFlags = useMemo(() => {
    if (!flags) return [];
    if (!search.trim()) return flags;
    const query = search.toLowerCase().trim();
    return flags.filter(
      (f) =>
        f.key.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query),
    );
  }, [flags, search]);

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    setTogglingKeys((prev) => new Set(prev).add(key));
    try {
      await updateFlag.mutateAsync({ key, enabled: !currentEnabled });
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading feature flags..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Feature Flags" />

      <View className="px-4 pb-2">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search flags..." />
        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredFlags.length} flag{filteredFlags.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredFlags}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No feature flags"
            description={search.trim() ? "No flags match your search." : "No feature flags configured."}
            icon={<Flag size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                  {item.key}
                </Text>
                {item.description ? (
                  <Text
                    className="mt-0.5 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  Updated: {formatDate(item.updatedAt)}
                </Text>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => handleToggle(item.key, item.enabled)}
                disabled={togglingKeys.has(item.key)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
                thumbColor={item.enabled ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
