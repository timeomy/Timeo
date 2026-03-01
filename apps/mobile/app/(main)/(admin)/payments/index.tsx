import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { DollarSign } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { usePayments } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

type StatusFilter = "all" | "completed" | "pending" | "refunded" | "failed";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Refunded", value: "refunded" },
];

function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "refunded":
      return "error";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

export default function PaymentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: payments, isLoading, refetch, isRefetching } = usePayments(tenantId);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (statusFilter === "all") return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const totals = useMemo(() => {
    if (!payments) return { received: 0, refunded: 0 };
    return {
      received: payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
      refunded: payments
        .filter((p) => p.status === "refunded")
        .reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Payments" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading payments..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Payments" onBack={() => router.back()} />

      {/* Summary Cards */}
      <View className="flex-row px-4 pb-3" style={{ gap: 12 }}>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Total Received
          </Text>
          <Text className="mt-1 text-lg font-bold" style={{ color: theme.colors.success }}>
            {formatPrice(totals.received)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Total Refunded
          </Text>
          <Text className="mt-1 text-lg font-bold" style={{ color: theme.colors.error }}>
            {formatPrice(totals.refunded)}
          </Text>
        </View>
      </View>

      {/* Status Filter */}
      <View className="flex-row px-4 pb-3" style={{ gap: 8 }}>
        {STATUS_FILTERS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setStatusFilter(opt.value)}
            className="rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                statusFilter === opt.value
                  ? theme.colors.primary + "20"
                  : theme.colors.surface,
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color:
                  statusFilter === opt.value
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="px-4 pb-2">
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredPayments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No payments found"
            description={
              statusFilter !== "all"
                ? "Try changing the filter."
                : "Payments will appear here as they come in."
            }
            icon={<DollarSign size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
                  {formatPrice(item.amount)}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.provider}{item.method ? ` · ${item.method}` : ""}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <Badge label={item.status} variant={getStatusVariant(item.status)} />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
