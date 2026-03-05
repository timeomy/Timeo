import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
} from "lucide-react-native";
import { usePosTransactions } from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "qr_pay":
      return "QR Pay";
    case "bank_transfer":
      return "Transfer";
    default:
      return method;
  }
}

function PaymentMethodIcon({
  method,
  color,
}: {
  method: string;
  color: string;
}) {
  switch (method) {
    case "cash":
      return <Banknote size={14} color={color} />;
    case "card":
      return <CreditCard size={14} color={color} />;
    case "qr_pay":
      return <QrCode size={14} color={color} />;
    case "bank_transfer":
      return <Building2 size={14} color={color} />;
    default:
      return <CreditCard size={14} color={color} />;
  }
}

export default function ReceiptsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: transactions, isLoading, refetch } = usePosTransactions(activeTenantId);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  if (!activeTenantId) {
    return (
      <Screen>
        <Header title="Receipts" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading receipts..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Receipts" onBack={() => router.back()} />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 8,
          gap: 10,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No receipts yet"
            description="Your transaction receipts will appear here."
            icon={<Receipt size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start">
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Receipt size={20} color={theme.colors.primary} />
              </View>
              <View className="flex-1">
                {/* Receipt Number & Total */}
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-sm font-bold font-mono"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                  >
                    {item.receiptNumber ?? item.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    RM {((item.total ?? item.amount) / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Date & Time */}
                <Text
                  className="mt-1 text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {formatDate(item.createdAt)} at {formatTime(item.createdAt)}
                </Text>

                {/* Payment Method & Status Row */}
                <View className="mt-2 flex-row items-center gap-2">
                  <View
                    className="flex-row items-center rounded-full px-2.5 py-1"
                    style={{ backgroundColor: theme.colors.info + "15" }}
                  >
                    <PaymentMethodIcon
                      method={item.paymentMethod}
                      color={theme.colors.info}
                    />
                    <Text
                      className="ml-1.5 text-xs font-medium"
                      style={{ color: theme.colors.info }}
                    >
                      {getPaymentMethodLabel(item.paymentMethod)}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor:
                        item.status === "completed"
                          ? theme.colors.success + "15"
                          : item.status === "voided"
                            ? theme.colors.error + "15"
                            : theme.colors.warning + "15",
                    }}
                  >
                    <Text
                      className="text-xs font-medium capitalize"
                      style={{
                        color:
                          item.status === "completed"
                            ? theme.colors.success
                            : item.status === "voided"
                              ? theme.colors.error
                              : theme.colors.warning,
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Items Summary */}
                {item.items && item.items.length > 0 ? (
                  <Text
                    className="mt-2 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {item.items.length} item{item.items.length !== 1 ? "s" : ""}
                    {" — "}
                    {item.items.map((i) => i.name).join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
