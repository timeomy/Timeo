import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Plus, CreditCard } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Row,
  Spacer,
  PriceDisplay,
  LoadingScreen,
  EmptyState,
  Toast,
  useTheme,
} from "@timeo/ui";
import { useMemberships, useUpdateMembership } from "@timeo/api-client";

export default function MembershipsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const { data: memberships, isLoading } = useMemberships(tenantId);
  const { mutateAsync: updateMembership } = useUpdateMembership(tenantId ?? "");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const handleToggleActive = useCallback(
    async (membershipId: string, currentIsActive: boolean) => {
      try {
        await updateMembership({ membershipId, isActive: !currentIsActive });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to toggle membership plan";
        setToast({ message, type: "error", visible: true });
      }
    },
    [updateMembership]
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Membership Plans" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading memberships..." />;
  }

  const renderMembership = ({
    item,
  }: {
    item: NonNullable<typeof memberships>[0];
  }) => (
    <Card
      className="mb-3"
      onPress={() => router.push(`/memberships/${item.id}/edit`)}
    >
      <Row justify="between" align="start">
        <View className="flex-1 mr-3">
          <Row align="center" gap={8}>
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {!item.isActive && <Badge label="Inactive" variant="error" />}
          </Row>
          {item.description ? (
            <Text
              className="mt-1 text-sm"
              style={{ color: theme.colors.textSecondary }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <Row align="center" gap={8} className="mt-2">
            <PriceDisplay
              amount={item.price}
              currency={item.currency}
              size="sm"
            />
            <Badge
              label={item.billingInterval === "monthly" ? "Monthly" : "Yearly"}
              variant="info"
            />
          </Row>
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
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.primary }}
                >
                  +{item.benefits.length - 3} more
                </Text>
              )}
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleToggleActive(item.id, item.isActive)}
        >
          <Badge
            label={item.isActive ? "Active" : "Inactive"}
            variant={item.isActive ? "success" : "default"}
          />
        </TouchableOpacity>
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header
        title="Membership Plans"
        onBack={() => router.back()}
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/memberships/new/edit")}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={memberships}
        keyExtractor={(item) => item.id}
        renderItem={renderMembership}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No membership plans"
            description="Create your first membership plan to offer recurring subscriptions."
            icon={<CreditCard size={32} color={theme.colors.textSecondary} />}
            action={{
              label: "Create Plan",
              onPress: () => router.push("/memberships/new/edit"),
            }}
          />
        }
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
