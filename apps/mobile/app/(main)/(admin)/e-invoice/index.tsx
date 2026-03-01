import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useEInvoiceRequests } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

type StatusFilter = "all" | "pending" | "submitted" | "rejected";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Submitted", value: "submitted" },
  { label: "Rejected", value: "rejected" },
];

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "pending":
      return "warning";
    case "submitted":
    case "accepted":
      return "success";
    case "rejected":
      return "error";
    default:
      return "default";
  }
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

export default function EInvoiceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: requests, isLoading, refetch, isRefetching } = useEInvoiceRequests(
    tenantId,
    statusFilter !== "all" ? { status: statusFilter } : undefined,
  );

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests;
  }, [requests]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="e-Invoice Requests" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading e-invoice requests..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="e-Invoice Requests" onBack={() => router.back()} />

      <View className="px-4">
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setStatusFilter(option.value)}
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor:
                  statusFilter === option.value
                    ? theme.colors.primary + "20"
                    : theme.colors.surface,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    statusFilter === option.value
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No e-invoice requests"
            description={
              statusFilter !== "all"
                ? "Try changing the filter."
                : "Requests will appear here when customers submit them."
            }
            icon={<FileText size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  {item.invoiceNumber}
                </Text>
                {item.buyerName && (
                  <Text className="mt-0.5 text-sm" style={{ color: theme.colors.textSecondary }}>
                    {item.buyerName}
                  </Text>
                )}
                {item.buyerEmail && (
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {item.buyerEmail}
                  </Text>
                )}
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <View className="items-end" style={{ gap: 4 }}>
                <Badge label={item.status} variant={getStatusVariant(item.status)} />
                <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                  RM {(item.totalAmount / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
