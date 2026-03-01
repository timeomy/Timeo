import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Receipt,
  Plus,
  ShoppingCart,
  TrendingUp,
  XCircle,
  Percent,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { usePosTransactions, useDailySummary } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  StatCard,
  LoadingScreen,
  EmptyState,
  Spacer,
  useTheme,
} from "@timeo/ui";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString([], {
    month: "short",
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
      return "Transfer";
    default:
      return method;
  }
}

function getStatusColor(status: string, theme: any) {
  switch (status) {
    case "completed":
      return { bg: theme.colors.success + "15", text: theme.colors.success };
    case "voided":
      return { bg: theme.colors.error + "15", text: theme.colors.error };
    case "refunded":
      return { bg: theme.colors.warning + "15", text: theme.colors.warning };
    default:
      return { bg: theme.colors.info + "15", text: theme.colors.info };
  }
}

function getPaymentMethodColor(method: string, theme: any) {
  switch (method) {
    case "cash":
      return { bg: theme.colors.success + "15", text: theme.colors.success };
    case "card":
      return { bg: theme.colors.primary + "15", text: theme.colors.primary };
    case "qr_pay":
      return { bg: theme.colors.info + "15", text: theme.colors.info };
    case "bank_transfer":
      return { bg: theme.colors.warning + "15", text: theme.colors.warning };
    default:
      return { bg: theme.colors.info + "15", text: theme.colors.info };
  }
}

export default function POSScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const {
    data: transactions,
    isLoading,
    refetch,
    isRefetching,
  } = usePosTransactions(tenantId);
  const { data: summary } = useDailySummary(tenantId);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Point of Sale" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading transactions..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Point of Sale" onBack={() => router.back()} />

      {summary && (
        <View className="px-4 pb-3">
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <StatCard
                label="Transactions"
                value={summary.totalTransactions}
                icon={<ShoppingCart size={16} color={theme.colors.primary} />}
              />
            </View>
            <View className="flex-1">
              <StatCard
                label="Revenue"
                value={`RM ${((summary.totalRevenue ?? 0) / 100).toFixed(0)}`}
                icon={<TrendingUp size={16} color={theme.colors.success} />}
              />
            </View>
          </View>
          <Spacer size={8} />
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <StatCard
                label="Discount"
                value={`RM ${((summary.totalDiscount ?? 0) / 100).toFixed(0)}`}
                icon={<Percent size={16} color={theme.colors.warning} />}
              />
            </View>
            <View className="flex-1">
              <StatCard
                label="Voided"
                value={summary.voidedCount ?? 0}
                icon={<XCircle size={16} color={theme.colors.error} />}
              />
            </View>
          </View>
        </View>
      )}

      <View className="px-4 pb-2">
        <Text
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Recent Transactions ({transactions?.length ?? 0})
        </Text>
      </View>

      <FlatList
        data={transactions ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          gap: 8,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No transactions"
            description="Transactions will appear here as they are processed."
            icon={<Receipt size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => {
          const statusColors = getStatusColor(item.status, theme);
          const methodColors = getPaymentMethodColor(item.paymentMethod, theme);
          const total = item.total ?? item.amount ?? 0;

          return (
            <TouchableOpacity
              onPress={() => router.push(`/pos/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <Card>
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      {item.receiptNumber ?? item.id.slice(-6).toUpperCase()}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {item.customerName}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      RM {(total / 100).toFixed(2)}
                    </Text>
                    <View className="mt-1 flex-row" style={{ gap: 4 }}>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: methodColors.bg }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: methodColors.text }}
                        >
                          {formatPaymentMethod(item.paymentMethod)}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: statusColors.bg }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: statusColors.text }}
                        >
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => router.push("/pos/new" as any)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: theme.colors.primary, elevation: 5 }}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
      </TouchableOpacity>
    </Screen>
  );
}
