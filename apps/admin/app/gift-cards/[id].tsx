import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Input,
  Row,
  Spacer,
  Separator,
  Modal,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "depleted":
      return "warning";
    case "expired":
      return "error";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case "purchase":
      return "Purchased";
    case "redemption":
      return "Redeemed";
    case "topup":
      return "Top Up";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

function getTransactionColor(type: string, theme: any): string {
  switch (type) {
    case "purchase":
    case "topup":
      return theme.colors.success;
    case "redemption":
      return theme.colors.warning;
    case "refund":
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
}

export default function GiftCardDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const giftCards = useQuery(
    api.giftCards.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const transactions = useQuery(
    api.giftCards.getTransactions,
    id ? { giftCardId: id as any } : "skip"
  );

  const topupMutation = useMutation(api.giftCards.topup);
  const cancelMutation = useMutation(api.giftCards.cancel);
  const reactivateMutation = useMutation(api.giftCards.reactivate);
  const removeMutation = useMutation(api.giftCards.remove);

  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const card = useMemo(() => {
    if (!giftCards) return null;
    return giftCards.find((c) => c._id === id) ?? null;
  }, [giftCards, id]);

  const handleTopup = useCallback(async () => {
    const parsedAmount = parseFloat(topupAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setToast({
        message: "Please enter a valid amount",
        type: "error",
        visible: true,
      });
      return;
    }

    setLoading(true);
    try {
      await topupMutation({
        giftCardId: id as any,
        amount: Math.round(parsedAmount * 100),
      });
      setToast({
        message: "Gift card topped up successfully",
        type: "success",
        visible: true,
      });
      setTopupModalVisible(false);
      setTopupAmount("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to top up gift card";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [topupAmount, id, topupMutation]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Gift Card",
      "Are you sure you want to cancel this gift card? It will no longer be usable.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await cancelMutation({ giftCardId: id as any });
              setToast({
                message: "Gift card cancelled",
                type: "success",
                visible: true,
              });
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Failed to cancel gift card";
              setToast({ message, type: "error", visible: true });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [id, cancelMutation]);

  const handleReactivate = useCallback(async () => {
    setLoading(true);
    try {
      await reactivateMutation({ giftCardId: id as any });
      setToast({
        message: "Gift card reactivated",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reactivate gift card";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [id, reactivateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Gift Card",
      "Are you sure you want to permanently delete this gift card and all its transactions? This cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await removeMutation({ giftCardId: id as any });
              setToast({
                message: "Gift card deleted",
                type: "success",
                visible: true,
              });
              setTimeout(() => router.back(), 1200);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Failed to delete gift card";
              setToast({ message, type: "error", visible: true });
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [id, removeMutation, router]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Gift Card" onBack={() => router.back()} />
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

  if (giftCards === undefined) {
    return <LoadingScreen message="Loading gift card..." />;
  }

  if (!card) {
    return (
      <Screen>
        <Header title="Gift Card" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            Gift card not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const renderTransaction = ({ item }: { item: any }) => (
    <Card className="mb-2">
      <Row justify="between" align="center">
        <View>
          <Text
            className="text-sm font-semibold"
            style={{ color: getTransactionColor(item.type, theme) }}
          >
            {getTransactionTypeLabel(item.type)}
          </Text>
          <Text
            className="text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(item.createdAt)}
          </Text>
          {item.note ? (
            <Text
              className="mt-1 text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              {item.note}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text
            className="text-sm font-bold"
            style={{
              color:
                item.type === "redemption"
                  ? theme.colors.error
                  : theme.colors.success,
            }}
          >
            {item.type === "redemption" ? "-" : "+"}RM{" "}
            {(item.amount / 100).toFixed(2)}
          </Text>
          <Text
            className="text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            Bal: RM {(item.balanceAfter / 100).toFixed(2)}
          </Text>
        </View>
      </Row>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Header title="Gift Card Details" onBack={() => router.back()} />

      <FlatList
        data={transactions ?? []}
        keyExtractor={(item) => item._id}
        renderItem={renderTransaction}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Card Info */}
            <Card className="mb-4">
              <View className="items-center py-2">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.colors.text, fontFamily: "monospace" }}
                >
                  {card.code}
                </Text>
                <Spacer size={8} />
                <Badge
                  label={card.status}
                  variant={getStatusVariant(card.status)}
                />
              </View>

              <Separator className="my-3" />

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Current Balance
                </Text>
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text }}
                >
                  RM {(card.currentBalance / 100).toFixed(2)}
                </Text>
              </Row>

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Initial Balance
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.text }}
                >
                  RM {(card.initialBalance / 100).toFixed(2)}
                </Text>
              </Row>

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Currency
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.text }}
                >
                  {card.currency}
                </Text>
              </Row>

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Created
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.text }}
                >
                  {formatDate(card.createdAt)}
                </Text>
              </Row>

              {card.expiresAt ? (
                <Row justify="between" className="mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Expires
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    {formatDate(card.expiresAt)}
                  </Text>
                </Row>
              ) : null}

              {card.purchaserName ? (
                <Row justify="between" className="mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Purchaser
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    {card.purchaserName}
                  </Text>
                </Row>
              ) : null}

              {card.recipientName ? (
                <Row justify="between" className="mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Recipient
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    {card.recipientName}
                  </Text>
                </Row>
              ) : null}

              {card.message ? (
                <>
                  <Separator className="my-2" />
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Message
                  </Text>
                  <Text
                    className="mt-1 text-sm italic"
                    style={{ color: theme.colors.text }}
                  >
                    "{card.message}"
                  </Text>
                </>
              ) : null}
            </Card>

            {/* Action Buttons */}
            <View className="mb-4">
              {card.status === "active" && (
                <>
                  <Button onPress={() => setTopupModalVisible(true)}>
                    Top Up Balance
                  </Button>
                  <Spacer size={8} />
                  <Button variant="destructive" onPress={handleCancel} loading={loading}>
                    Cancel Gift Card
                  </Button>
                </>
              )}

              {card.status === "cancelled" && (
                <Button onPress={handleReactivate} loading={loading}>
                  Reactivate Gift Card
                </Button>
              )}

              <Spacer size={8} />
              <Button
                variant="destructive"
                onPress={handleDelete}
                loading={loading}
              >
                Delete Gift Card
              </Button>
            </View>

            <Separator className="mb-3" />

            <Text
              className="mb-3 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              Transaction History
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              No transactions yet.
            </Text>
          </View>
        }
      />

      {/* Top Up Modal */}
      <Modal
        visible={topupModalVisible}
        onClose={() => {
          setTopupModalVisible(false);
          setTopupAmount("");
        }}
        title="Top Up Gift Card"
      >
        <Input
          label="Amount (RM)"
          value={topupAmount}
          onChangeText={setTopupAmount}
          placeholder="25.00"
          keyboardType="decimal-pad"
          className="mb-4"
        />
        <Button onPress={handleTopup} loading={loading}>
          Confirm Top Up
        </Button>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
