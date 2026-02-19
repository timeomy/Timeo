import { useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Mail, Package, FileText } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
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
  ErrorScreen,
  useTheme,
} from "@timeo/ui";
import { formatDate, formatTime, formatPrice } from "@timeo/shared";
// Next valid status for progression
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

export default function OrderDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id as any;

  const order = useQuery(api.orders.getById, { orderId });

  const updateStatus = useMutation(api.orders.updateStatus);

  const handleAdvanceStatus = useCallback(async () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    try {
      await updateStatus({
        orderId,
        status: nextStatus as
          | "pending"
          | "confirmed"
          | "preparing"
          | "ready"
          | "completed"
          | "cancelled",
      });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update order status"
      );
    }
  }, [order, updateStatus, orderId]);

  const handleCancel = useCallback(() => {
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
              await updateStatus({
                orderId,
                status: "cancelled",
              });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to cancel order"
              );
            }
          },
        },
      ]
    );
  }, [updateStatus, orderId]);

  if (order === undefined) {
    return <LoadingScreen message="Loading order..." />;
  }

  if (order === null) {
    return (
      <ErrorScreen
        title="Order not found"
        message="This order may have been deleted."
        onRetry={() => router.back()}
      />
    );
  }

  const nextStatusLabel = NEXT_STATUS_LABEL[order.status];
  const canCancel =
    order.status !== "completed" && order.status !== "cancelled";
  const orderNumber = order._id.slice(-6).toUpperCase();

  return (
    <Screen padded={false}>
      <Header title={`Order #${orderNumber}`} onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Status and Total */}
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

        {/* Customer Info */}
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
                {order.customerEmail && (
                  <View className="mt-1 flex-row items-center">
                    <Mail size={13} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1.5 text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {order.customerEmail}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Section>

        {/* Order Items */}
        <Section title="Items">
          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: theme.colors.surface }}
          >
            {order.items.map((item, index) => (
              <View key={item._id}>
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
                      {item.snapshotName}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {formatPrice(item.snapshotPrice)} x {item.quantity}
                    </Text>
                  </View>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {formatPrice(item.snapshotPrice * item.quantity)}
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

            {/* Total row */}
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

        {/* Notes */}
        {order.notes && (
          <Section title="Notes">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-start">
                <FileText
                  size={16}
                  color={theme.colors.textSecondary}
                />
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

        {/* Action Buttons */}
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
