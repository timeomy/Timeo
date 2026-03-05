import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Flag, Building2 } from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Switch,
  Section,
  Badge,
  Separator,
  Button,
  Spacer,
  LoadingScreen,
  ErrorScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import {
  usePlatformFlags,
  useUpdatePlatformFlag,
  useSetFlagOverride,
  usePlatformTenants,
  type FeatureFlag,
  type PlatformTenant,
} from "@timeo/api-client";

export default function FlagDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [togglingTenants, setTogglingTenants] = useState<Set<string>>(
    new Set()
  );

  const { data: allFlags } = usePlatformFlags();
  const { data: tenants } = usePlatformTenants();
  const { mutateAsync: updateFlag } = useUpdatePlatformFlag();
  const { mutateAsync: setFlagOverride } = useSetFlagOverride();

  const globalFlag = useMemo(() => {
    if (!allFlags) return null;
    return allFlags.find((f: FeatureFlag) => f.key === key) ?? null;
  }, [allFlags, key]);

  // Map of tenantId -> enabled from overrides
  const overrideMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (globalFlag) {
      for (const override of globalFlag.overrides) {
        map.set(override.tenantId, override.enabled);
      }
    }
    return map;
  }, [globalFlag]);

  const handleToggleGlobal = useCallback(
    async (enabled: boolean) => {
      if (!key) return;
      setTogglingGlobal(true);
      try {
        await updateFlag({ key, enabled });
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to toggle flag. ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setTogglingGlobal(false);
      }
    },
    [key, updateFlag]
  );

  const handleToggleTenantOverride = useCallback(
    async (tenantId: string, enabled: boolean) => {
      if (!key || !globalFlag) return;
      setTogglingTenants((prev) => new Set(prev).add(tenantId));
      try {
        await setFlagOverride({ flagId: globalFlag.id, tenantId, enabled });
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to set tenant override. ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setTogglingTenants((prev) => {
          const next = new Set(prev);
          next.delete(tenantId);
          return next;
        });
      }
    },
    [key, globalFlag, setFlagOverride]
  );

  if (!key) {
    return (
      <ErrorScreen title="Invalid Flag" message="No flag key provided." />
    );
  }

  if (allFlags === undefined || tenants === undefined) {
    return <LoadingScreen message="Loading flag details..." />;
  }

  if (!globalFlag) {
    return (
      <Screen>
        <Header title="Flag Detail" onBack={() => router.back()} />
        <ErrorScreen
          title="Flag Not Found"
          message={`No global feature flag found with key "${key}".`}
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Header title="Flag Detail" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Flag Info */}
        <Card variant="elevated" className="mt-2">
          <View className="flex-row items-center">
            <View
              className="mr-3 rounded-2xl p-3"
              style={{ backgroundColor: theme.colors.primary + "15" }}
            >
              <Flag size={24} color={theme.colors.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-lg font-bold"
                style={{ color: theme.colors.text }}
              >
                {globalFlag.key}
              </Text>
              {globalFlag.description ? (
                <Text
                  className="mt-0.5 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {globalFlag.description}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Global State */}
        <Section title="Global State">
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Enabled Globally
                </Text>
                <Text
                  className="mt-0.5 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {globalFlag.enabled
                    ? "This flag is active for all tenants by default."
                    : "This flag is disabled for all tenants by default."}
                </Text>
              </View>
              <Switch
                value={globalFlag.enabled}
                onValueChange={handleToggleGlobal}
              />
            </View>
          </Card>
        </Section>

        {/* Per-Tenant Overrides */}
        <Section title="Per-Tenant Overrides">
          <Text
            className="mb-3 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Override the global flag state for individual tenants. Tenants
            without an override inherit the global state.
          </Text>

          {tenants.length === 0 ? (
            <EmptyState
              title="No tenants"
              description="Create tenants to configure per-tenant overrides."
              icon={
                <Building2 size={28} color={theme.colors.textSecondary} />
              }
            />
          ) : (
            <Card>
              {tenants.map((tenant: PlatformTenant, index: number) => {
                const hasOverride = overrideMap.has(tenant.id);
                const isEnabled = hasOverride
                  ? overrideMap.get(tenant.id)!
                  : globalFlag.enabled;
                const isToggling = togglingTenants.has(tenant.id);

                return (
                  <View key={tenant.id}>
                    <View className="flex-row items-center justify-between py-3">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center">
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: theme.colors.text }}
                            numberOfLines={1}
                          >
                            {tenant.name}
                          </Text>
                          {hasOverride ? (
                            <Badge
                              label="Override"
                              variant="warning"
                              className="ml-2"
                            />
                          ) : null}
                        </View>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          /{tenant.slug}
                          {!hasOverride ? " (inherits global)" : ""}
                        </Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={(val) =>
                          handleToggleTenantOverride(tenant.id, val)
                        }
                      />
                    </View>
                    {index < tenants.length - 1 ? <Separator /> : null}
                  </View>
                );
              })}
            </Card>
          )}
        </Section>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
