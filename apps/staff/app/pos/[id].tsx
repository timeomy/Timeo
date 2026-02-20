import { useCallback, useState } from "react";
import { View, Text, ScrollView, Alert, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Receipt,
  User,
  Calendar,
  CreditCard,
  Tag,
  XCircle,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import {
  Screen,
  Header,
  Card,
  Button,
  Badge,
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
  const { id } = useLocalSearchParams();
  const [voidReason, setVoidReason] = useState("");
  const [showVoidInput, setShowVoidInput] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const receipt = useQuery(
    api.pos.getReceipt,
    id ? { transactionId: id as any } : "skip"
  );

  const voidTransaction = useMutation(api.pos.voidTransaction);

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
                transactionId: id as any,
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

  if (receipt === undefined) {
    return <LoadingScreen message="Loading receipt..." />;
  }

  if (!receipt) {
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
    receipt.status === "completed"
      ? theme.colors.success
      : receipt.status === "voided"
        ? theme.colors.error
        : theme.colors.warning;

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
              {receipt.receiptNumber}
            </Text>
            {receipt.tenantName && (
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {receipt.tenantName}
              </Text>
            )}
            <Spacer size={8} />
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: statusColor + "15" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: statusColor }}
              >
                {receipt.status.charAt(0).toUpperCase() +
                  receipt.status.slice(1)}
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
              {formatDate(receipt.createdAt)}
            </Text>
          </View>
          <Spacer size={8} />
          <View className="flex-row items-center">
            <User size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-2 text-sm"
              style={{ color: theme.colors.text }}
            >
              {receipt.customerName}
              {receipt.customerEmail ? ` (${receipt.customerEmail})` : ""}
            </Text>
          </View>
          <Spacer size={8} />
          <View className="flex-row items-center">
            <User size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-2 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Staff: {receipt.staffName}
            </Text>
          </View>
          <Spacer size={8} />
          <View className="flex-row items-center">
            <CreditCard size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-2 text-sm"
              style={{ color: theme.colors.text }}
            >
              {formatPaymentMethod(receipt.paymentMethod)}
            </Text>
          </View>
          {receipt.voucherCode && (
            <>
              <Spacer size={8} />
              <View className="flex-row items-center">
                <Tag size={14} color={theme.colors.success} />
                <Text
                  className="ml-2 text-sm"
                  style={{ color: theme.colors.success }}
                >
                  Voucher: {receipt.voucherCode}
                </Text>
              </View>
            </>
          )}
        </Card>

        <Spacer size={12} />

        {/* Items */}
        <Card>
          <Text
            className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Items
          </Text>
          {receipt.items.map((item, index) => (
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
          <View className="flex-row items-center justify-between">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Subtotal
            </Text>
            <Text className="text-sm" style={{ color: theme.colors.text }}>
              RM {(receipt.subtotal / 100).toFixed(2)}
            </Text>
          </View>
          {receipt.discount > 0 && (
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
                -RM {(receipt.discount / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <Separator className="my-2" />
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
              RM {(receipt.total / 100).toFixed(2)}
            </Text>
          </View>
        </Card>

        {receipt.notes && (
          <>
            <Spacer size={12} />
            <Card>
              <Text
                className="mb-1 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Notes
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                {receipt.notes}
              </Text>
            </Card>
          </>
        )}

        <Spacer size={24} />

        {/* Void Button */}
        {receipt.status === "completed" && (
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
