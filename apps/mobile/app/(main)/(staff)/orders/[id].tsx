import { useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Package, FileText } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useOrder, useUpdateOrderStatus } from "@timeo/api-client";
import {
  Screen,
  Header,
  Button,
  StatusBadge,
  PriceDisplay,
  Avatar,
  Section,
  Separator,
  Spacer,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

const NEXT_STATUS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending: "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark as Ready",
  ready: "Complete Order",
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

export default function OrderDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: order, isLoading } = useOrder(tenantId, id);
  const updateStatus = useUpdateOrderStatus(tenantId ?? "");

  const handleAdvanceStatus = useCallback(async () => {
    if (!order || !id) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    try {
      await updateStatus.mutateAsync({ orderId: id, status: nextStatus });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update order status",
      );
    }
  }, [order, updateStatus, id]);

  const handleCancel = useCallback(() => {
    if (!id) return;
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ orderId: id, status: "cancelled" });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to cancel order",
              );
            }
          },
        },
      ],
    );
  }, [updateStatus, id]);

  if (isLoading) {
    return <LoadingScreen message="Loading order..." />;
  }

  if (!order) {
    return (
      <Screen>
        <Header title="Order" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            Order not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const nextStatusLabel = NEXT_STATUS_LABEL[order.status];
  const canCancel = order.status !== "completed" && order.status !== "cancelled";
  const orderNumber = order.id.slice(-6).toUpperCase();

  return (
    <Screen padded={false}>
      <Header title={`Order #${orderNumber}`} onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center pb-4 pt-2">
          <StatusBadge status={order.status} />
          <View className="mt-3">
            <PriceDisplay
              amount={order.totalAmount}
              currency={order.currency}
              size="lg"
            />
          </View>
          <Text
            className="mt-1 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
          </Text>
        </View>

        <Separator />

        {order.customerName && (
          <Section title="Customer">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-center">
                <Avatar fallback={order.customerName} size="md" />
                <View className="ml-3 flex-1">
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    {order.customerName}
                  </Text>
                </View>
              </View>
            </View>
          </Section>
        )}

        <Section title="Items">
          <View
            className="overflow-hidden rounded-2xl"
            style={{ backgroundColor: theme.colors.surface }}
          >
            {order.items.map((item, index) => (
              <View key={index}>
                <View className="flex-row items-center p-4">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.primary + "15" }}
                  >
                    <Package size={18} color={theme.colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.text }}
                      numberOfLines={1}
                    >
                      {item.snapshotName ?? item.productName ?? "Item"}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {formatPrice(item.snapshotPrice ?? item.unitPrice)} x{" "}
                      {item.quantity}
                    </Text>
                  </View>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {formatPrice(
                      (item.snapshotPrice ?? item.unitPrice) * item.quantity,
                    )}
                  </Text>
                </View>
                {index < order.items.length - 1 && (
                  <View
                    className="mx-4 h-px"
                    style={{ backgroundColor: theme.colors.border }}
                  />
                )}
              </View>
            ))}

            <View
              className="flex-row items-center justify-between border-t p-4"
              style={{ borderColor: theme.colors.border }}
            >
              <Text
                className="text-base font-bold"
                style={{ color: theme.colors.text }}
              >
                Total
              </Text>
              <PriceDisplay
                amount={order.totalAmount}
                currency={order.currency}
              />
            </View>
          </View>
        </Section>

        {order.notes && (
          <Section title="Notes">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-start">
                <FileText size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-3 flex-1 text-sm leading-5"
                  style={{ color: theme.colors.text }}
                >
                  {order.notes}
                </Text>
              </View>
            </View>
          </Section>
        )}

        <Spacer size={16} />

        <View style={{ gap: 10 }}>
          {nextStatusLabel && (
            <Button onPress={handleAdvanceStatus}>{nextStatusLabel}</Button>
          )}
          {canCancel && (
            <Button variant="destructive" onPress={handleCancel}>
              Cancel Order
            </Button>
          )}
        </View>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
