import { useState, useMemo } from "react";
import { View, Text, ScrollView, Switch, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  usePlatformFlags,
  usePlatformTenants,
  useUpdatePlatformFlag,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  SearchInput,
  Spacer,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FlagDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();

  const { data: flags, isLoading: flagsLoading, refetch, isRefetching } = usePlatformFlags();
  const { data: tenants, isLoading: tenantsLoading } = usePlatformTenants();
  const updateFlag = useUpdatePlatformFlag();

  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(false);

  const flag = useMemo(() => flags?.find((f) => f.key === key), [flags, key]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!search.trim()) return tenants;
    const query = search.toLowerCase().trim();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query),
    );
  }, [tenants, search]);

  const isLoading = flagsLoading || tenantsLoading;

  if (isLoading) {
    return <LoadingScreen message="Loading flag detail..." />;
  }

  if (!flag) {
    return (
      <Screen>
        <Header title="Flag Detail" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base" style={{ color: theme.colors.textSecondary }}>
            Flag not found: {key}
          </Text>
        </View>
      </Screen>
    );
  }

  const handleGlobalToggle = async () => {
    setToggling(true);
    try {
      await updateFlag.mutateAsync({ key: flag.key, enabled: !flag.enabled });
    } finally {
      setToggling(false);
    }
  };

  return (
    <Screen padded={false}>
      <Header title={flag.key} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Flag Info */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
            {flag.key}
          </Text>
          {flag.description ? (
            <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
              {flag.description}
            </Text>
          ) : null}
          <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
            Updated: {formatDate(flag.updatedAt)}
          </Text>

          <Spacer size={12} />

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                Global Toggle
              </Text>
              <Badge
                label={flag.enabled ? "Enabled" : "Disabled"}
                variant={flag.enabled ? "success" : "error"}
              />
            </View>
            <Switch
              value={flag.enabled}
              onValueChange={handleGlobalToggle}
              disabled={toggling}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
              thumbColor={flag.enabled ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        </View>

        <Spacer size={16} />

        {/* Tenants Overview */}
        <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
          Tenants
        </Text>
        <Spacer size={8} />
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search tenants..." />
        <Spacer size={8} />
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {filteredTenants.length} tenant{filteredTenants.length !== 1 ? "s" : ""}
          {" — "}
          {flag.enabled ? "Flag is globally enabled for all tenants." : "Flag is globally disabled."}
        </Text>
        <Spacer size={10} />

        {filteredTenants.map((tenant) => (
          <View
            key={tenant.id}
            className="mb-2 rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                  {tenant.name}
                </Text>
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  /{tenant.slug}
                </Text>
              </View>
              <Badge
                label={flag.enabled ? "Inherited: ON" : "Inherited: OFF"}
                variant={flag.enabled ? "success" : "default"}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
