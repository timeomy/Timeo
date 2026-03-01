import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Building2, Settings, Flag } from "lucide-react-native";
import {
  usePlatformTenants,
  useUpdatePlatformTenant,
  useSuspendPlatformTenant,
  usePlatformFlags,
  useUpdatePlatformFlag,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  Spacer,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

const PLAN_OPTIONS = ["free", "starter", "pro", "enterprise"];

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

export default function TenantDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: tenants, isLoading, refetch, isRefetching } = usePlatformTenants();
  const { data: flags } = usePlatformFlags();
  const updateTenant = useUpdatePlatformTenant();
  const suspendTenant = useSuspendPlatformTenant();
  const updateFlag = useUpdatePlatformFlag();

  const tenant = useMemo(() => tenants?.find((t) => t.id === id), [tenants, id]);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const currentPlan = selectedPlan ?? tenant?.plan ?? "free";

  if (isLoading) {
    return <LoadingScreen message="Loading tenant..." />;
  }

  if (!tenant) {
    return (
      <Screen>
        <Header title="Tenant Detail" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base" style={{ color: theme.colors.textSecondary }}>
            Tenant not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const handlePlanChange = async () => {
    if (!selectedPlan || selectedPlan === tenant.plan) return;
    await updateTenant.mutateAsync({ id: tenant.id, plan: selectedPlan });
    setSelectedPlan(null);
  };

  const handleSuspendToggle = () => {
    if (tenant.status === "suspended") {
      Alert.alert("Activate Tenant", `Re-activate ${tenant.name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: () => updateTenant.mutateAsync({ id: tenant.id, status: "active" }),
        },
      ]);
    } else {
      Alert.alert("Suspend Tenant", `Suspend ${tenant.name}? This will block all access.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: () => suspendTenant.mutateAsync(tenant.id),
        },
      ]);
    }
  };

  return (
    <Screen padded={false}>
      <Header title={tenant.name} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Tenant Info Card */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View
              className="items-center justify-center rounded-xl"
              style={{ width: 48, height: 48, backgroundColor: theme.colors.primary + "20" }}
            >
              <Building2 size={24} color={theme.colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {tenant.name}
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                /{tenant.slug}
              </Text>
            </View>
          </View>
          <View className="mt-3 flex-row" style={{ gap: 6 }}>
            <Badge label={tenant.plan} variant={getPlanVariant(tenant.plan)} />
            <Badge label={tenant.status} variant={getStatusVariant(tenant.status)} />
          </View>
        </View>

        <Spacer size={16} />

        {/* Details */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Settings size={16} color={theme.colors.textSecondary} />
            <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
              Details
            </Text>
          </View>
          <Spacer size={12} />
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Created</Text>
            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
              {formatDate(tenant.createdAt)}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Members</Text>
            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
              {tenant.memberCount}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>MRR</Text>
            <Text className="text-sm font-bold" style={{ color: theme.colors.success }}>
              RM {(tenant.mrr / 100).toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Total Revenue</Text>
            <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
              RM {(tenant.revenue / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        <Spacer size={16} />

        {/* Change Plan */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
            Change Plan
          </Text>
          <Spacer size={10} />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {PLAN_OPTIONS.map((plan) => (
              <TouchableOpacity
                key={plan}
                onPress={() => setSelectedPlan(plan)}
                className="rounded-xl px-3 py-2"
                style={{
                  backgroundColor:
                    currentPlan === plan ? theme.colors.primary + "20" : theme.colors.background,
                }}
              >
                <Text
                  className="text-sm font-medium capitalize"
                  style={{
                    color: currentPlan === plan ? theme.colors.primary : theme.colors.textSecondary,
                  }}
                >
                  {plan}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedPlan && selectedPlan !== tenant.plan && (
            <TouchableOpacity
              onPress={handlePlanChange}
              disabled={updateTenant.isPending}
              className="mt-3 items-center rounded-xl py-2.5"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-sm font-bold" style={{ color: "#fff" }}>
                {updateTenant.isPending ? "Updating..." : `Change to ${selectedPlan}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Spacer size={16} />

        {/* Status Toggle */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                Tenant Status
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {tenant.status === "suspended"
                  ? "Tenant is suspended. Tap to re-activate."
                  : "Tap to suspend this tenant."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSuspendToggle}
              className="rounded-xl px-4 py-2"
              style={{
                backgroundColor:
                  tenant.status === "suspended" ? theme.colors.success + "20" : theme.colors.error + "20",
              }}
            >
              <Text
                className="text-sm font-bold"
                style={{
                  color: tenant.status === "suspended" ? theme.colors.success : theme.colors.error,
                }}
              >
                {tenant.status === "suspended" ? "Activate" : "Suspend"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Spacer size={16} />

        {/* Feature Flags */}
        {flags && flags.length > 0 && (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Flag size={16} color={theme.colors.textSecondary} />
              <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                Feature Flags
              </Text>
            </View>
            <Spacer size={10} />
            {flags.map((flag) => (
              <View key={flag.key} className="flex-row items-center justify-between py-2">
                <View className="flex-1 pr-3">
                  <Text className="text-sm" style={{ color: theme.colors.text }}>
                    {flag.key}
                  </Text>
                  {flag.description ? (
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }} numberOfLines={1}>
                      {flag.description}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={flag.enabled}
                  onValueChange={() =>
                    updateFlag.mutateAsync({ key: flag.key, enabled: !flag.enabled })
                  }
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
                  thumbColor={flag.enabled ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
