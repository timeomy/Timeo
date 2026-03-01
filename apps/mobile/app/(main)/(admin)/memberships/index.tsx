import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { CreditCard } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useMemberships, useUpdateMembership } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  PriceDisplay,
  LoadingScreen,
  EmptyState,
  Toast,
  useTheme,
} from "@timeo/ui";

export default function MembershipsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: memberships, isLoading, refetch, isRefetching } = useMemberships(tenantId);
  const updateMembership = useUpdateMembership(tenantId ?? "");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const handleToggleActive = useCallback(
    async (membershipId: string, currentActive: boolean) => {
      try {
        await updateMembership.mutateAsync({
          membershipId,
          isActive: !currentActive,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to toggle membership";
        setToast({ message, type: "error", visible: true });
      }
    },
    [updateMembership],
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Membership Plans" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading memberships..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Membership Plans" onBack={() => router.back()} />

      <FlatList
        data={memberships}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No membership plans"
            description="Create your first membership plan to offer recurring subscriptions."
            icon={<CreditCard size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleToggleActive(item.id, item.isActive)}
            activeOpacity={0.7}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {!item.isActive && <Badge label="Inactive" variant="error" />}
                </View>
                {item.description ? (
                  <Text
                    className="mt-1 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                  <PriceDisplay amount={item.price} currency={item.currency} size="sm" />
                  <Badge
                    label={item.billingInterval === "monthly" ? "Monthly" : "Yearly"}
                    variant="info"
                  />
                </View>
                {item.benefits && item.benefits.length > 0 ? (
                  <View className="mt-2">
                    {item.benefits.slice(0, 3).map((benefit, i) => (
                      <Text
                        key={i}
                        className="text-xs"
                        style={{ color: theme.colors.textSecondary }}
                        numberOfLines={1}
                      >
                        - {benefit}
                      </Text>
                    ))}
                    {item.benefits.length > 3 && (
                      <Text className="text-xs" style={{ color: theme.colors.primary }}>
                        +{item.benefits.length - 3} more
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
