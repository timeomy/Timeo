import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Flag, ChevronRight } from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Switch,
  SearchInput,
  EmptyState,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

export default function FlagsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  const flags = useQuery(api.platform.listFeatureFlags, {});
  const setFeatureFlag = useMutation(api.platform.setFeatureFlag);

  // Filter to only show global flags (tenantId undefined)
  const globalFlags = useMemo(() => {
    if (!flags) return [];
    return flags.filter((f) => !f.tenantId);
  }, [flags]);

  const filteredFlags = useMemo(() => {
    if (!search.trim()) return globalFlags;
    const query = search.toLowerCase().trim();
    return globalFlags.filter(
      (f) =>
        f.key.toLowerCase().includes(query) ||
        (f.metadata?.description &&
          String(f.metadata.description).toLowerCase().includes(query))
    );
  }, [globalFlags, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      setTogglingKeys((prev) => new Set(prev).add(key));
      try {
        await setFeatureFlag({ key, enabled });
      } catch (error) {
        console.error("Failed to toggle feature flag:", error);
      } finally {
        setTogglingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [setFeatureFlag]
  );

  if (flags === undefined) {
    return <LoadingScreen message="Loading feature flags..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Feature Flags" />

      <View className="px-4 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search flags..."
        />
      </View>

      <FlatList
        data={filteredFlags}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
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
              title="No flags found"
              description={`No feature flags match "${search}"`}
              icon={<Flag size={32} color={theme.colors.textSecondary} />}
            />
          ) : (
            <EmptyState
              title="No feature flags"
              description="No feature flags have been configured yet."
              icon={<Flag size={32} color={theme.colors.textSecondary} />}
            />
          )
        }
        renderItem={({ item: flag }) => (
          <Card
            onPress={() => router.push(`/flags/${flag.key}` as any)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center">
                  <View
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: flag.enabled
                        ? theme.colors.success
                        : theme.colors.border,
                    }}
                  />
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                  >
                    {flag.key}
                  </Text>
                </View>
                {flag.metadata?.description ? (
                  <Text
                    className="mt-1 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {String(flag.metadata.description)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-3">
                <Switch
                  value={flag.enabled}
                  onValueChange={(val) => handleToggle(flag.key, val)}
                />
                <ChevronRight
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
