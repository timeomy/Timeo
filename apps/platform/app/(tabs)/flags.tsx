import { useState, useMemo, useCallback } from "react";
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
import { usePlatformFlags, useUpdatePlatformFlag } from "@timeo/api-client";

export default function FlagsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { data: flagsData, isLoading, refetch } = usePlatformFlags();
  const { mutateAsync: updateFlag } = useUpdatePlatformFlag();

  const globalFlags = useMemo(() => flagsData ?? [], [flagsData]);

  const filteredFlags = useMemo(() => {
    if (!search.trim()) return globalFlags;
    const query = search.toLowerCase().trim();
    return globalFlags.filter(
      (f) =>
        f.key.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
    );
  }, [globalFlags, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      try {
        await updateFlag({ key, enabled });
      } catch (error) {
        console.error("Failed to toggle feature flag:", error);
      }
    },
    [updateFlag]
  );

  if (isLoading) {
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
        keyExtractor={(item) => item.id}
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
                {flag.description ? (
                  <Text
                    className="mt-1 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {flag.description}
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
