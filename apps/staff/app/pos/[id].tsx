import { useCallback, useState } from "react";
import { View, Text, ScrollView, Alert, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Receipt,
  User,
  Calendar,
  CreditCard,
  XCircle,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { usePosTransaction, useVoidPosTransaction } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Separator,
  Spacer,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "qr_pay":
      return "QR Pay";
    case "bank_transfer":
      return "Bank Transfer";
    default:
      return method;
  }
}

function formatItemType(type: string): string {
  switch (type) {
    case "membership":
      return "Membership";
    case "session_package":
      return "Session Package";
    case "service":
      return "Service";
    case "product":
      return "Product";
    default:
      return type;
  }
}

export default function TransactionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [voidReason, setVoidReason] = useState("");
  const [showVoidInput, setShowVoidInput] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const { data: transaction, isLoading } = usePosTransaction(tenantId, id);
  const { mutateAsync: voidTransaction } = useVoidPosTransaction(tenantId ?? "");

  const handleVoid = useCallback(async () => {
    if (!id) return;

    if (!showVoidInput) {
      setShowVoidInput(true);
      return;
    }

    Alert.alert(
      "Void Transaction",
      "Are you sure you want to void this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Void",
          style: "destructive",
          onPress: async () => {
            setVoiding(true);
            try {
              await voidTransaction({
                transactionId: id,
                reason: voidReason.trim() || undefined,
              });
              Alert.alert("Success", "Transaction has been voided.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to void transaction"
              );
            } finally {
              setVoiding(false);
            }
          },
        },
      ]
    );
  }, [id, showVoidInput, voidReason, voidTransaction, router]);

  if (!id) {
    return (
      <Screen>
        <Header title="Transaction" onBack={() => router.back()} />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading receipt..." />;
  }

  if (!transaction) {
    return (
      <Screen>
        <Header title="Transaction" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            Transaction not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const statusColor =
    transaction.status === "completed"
      ? theme.colors.success
      : transaction.status === "voided"
        ? theme.colors.error
        : theme.colors.warning;

  const total = transaction.total ?? transaction.amount;
  const items = transaction.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discount = Math.max(0, subtotal - total);

  return (
    <Screen padded={false}>
      <Header title="Receipt" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Receipt Header */}
        <Card>
          <View className="items-center">
            <Receipt size={28} color={theme.colors.primary} />
            <Spacer size={8} />
            <Text
              className="text-lg font-bold"
              style={{ color: theme.colors.text }}
            >
              {transaction.receiptNumber ?? id.slice(-6).toUpperCase()}
            </Text>
            <Spacer size={8} />
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: statusColor + "15" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: statusColor }}
              >
                {transaction.status.charAt(0).toUpperCase() +
                  transaction.status.slice(1)}
              </Text>
            </View>
          </View>
        </Card>

        <Spacer size={12} />

        {/* Transaction Details */}
        <Card>
          <View className="flex-row items-center">
            <Calendar size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-2 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {formatDate(new Date(transaction.createdAt).getTime())}
            </Text>
          </View>
          {transaction.customerName && (
            <>
              <Spacer size={8} />
              <View className="flex-row items-center">
                <User size={14} color={theme.colors.textSecondary} />
                <Text
                  className="ml-2 text-sm"
                  style={{ color: theme.colors.text }}
                >
                  {transaction.customerName}
                  {transaction.customerEmail
                    ? ` (${transaction.customerEmail})`
                    : ""}
                </Text>
              </View>
            </>
          )}
          <Spacer size={8} />
          <View className="flex-row items-center">
            <CreditCard size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-2 text-sm"
              style={{ color: theme.colors.text }}
            >
              {formatPaymentMethod(transaction.paymentMethod)}
            </Text>
          </View>
        </Card>

        {items.length > 0 && (
          <>
            <Spacer size={12} />

            {/* Items */}
            <Card>
              <Text
                className="mb-3 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Items
              </Text>
              {items.map((item, index) => (
                <View key={index}>
                  {index > 0 && <Separator className="my-2" />}
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: theme.colors.text }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {formatItemType(item.type)} x{item.quantity}
                      </Text>
                    </View>
                    <Text
                      className="text-sm font-medium"
                      style={{ color: theme.colors.text }}
                    >
                      RM {((item.price * item.quantity) / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}

              <Separator className="my-3" />

              {/* Totals */}
              {subtotal !== total && (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Subtotal
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      RM {(subtotal / 100).toFixed(2)}
                    </Text>
                  </View>
                  {discount > 0 && (
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text
                        className="text-sm"
                        style={{ color: theme.colors.success }}
                      >
                        Discount
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ color: theme.colors.success }}
                      >
                        -RM {(discount / 100).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Separator className="my-2" />
                </>
              )}
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-bold"
                  style={{ color: theme.colors.text }}
                >
                  Total
                </Text>
                <Text
                  className="text-lg font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  RM {(total / 100).toFixed(2)}
                </Text>
              </View>
            </Card>
          </>
        )}

        {transaction.notes && (
          <>
            <Spacer size={12} />
            <Card>
              <Text
                className="mb-1 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Notes
              </Text>
              <Text className="text-sm" style={{ color: theme.colors.text }}>
                {transaction.notes}
              </Text>
            </Card>
          </>
        )}

        <Spacer size={24} />

        {/* Void Button */}
        {transaction.status === "completed" && (
          <>
            {showVoidInput && (
              <Card>
                <Text
                  className="mb-2 text-sm font-semibold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Reason for voiding (optional)
                </Text>
                <TextInput
                  className="rounded-xl px-3 py-2.5 text-base"
                  style={{
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  placeholder="Enter reason..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={voidReason}
                  onChangeText={setVoidReason}
                />
                <Spacer size={12} />
              </Card>
            )}
            {showVoidInput && <Spacer size={12} />}
            <Button
              variant="destructive"
              size="lg"
              onPress={handleVoid}
              loading={voiding}
            >
              <View className="flex-row items-center">
                <XCircle size={18} color="#FFFFFF" />
                <Text className="ml-2 text-base font-semibold text-white">
                  {showVoidInput ? "Confirm Void" : "Void Transaction"}
                </Text>
              </View>
            </Button>
          </>
        )}

        <Spacer size={40} />
      </ScrollView>
    </Screen>
  );
}
