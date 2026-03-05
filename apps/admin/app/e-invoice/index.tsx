import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { useEInvoiceRequests } from "@timeo/api-client";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as string;

  const { data: requests, isLoading, refetch } = useEInvoiceRequests(tenantId);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="e-Invoice Requests" onBack={() => router.back()} />
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
    return <LoadingScreen message="Loading e-invoice requests..." />;
  }

  const renderRequest = ({ item }: { item: NonNullable<typeof requests>[0] }) => (
    <Card
      className="mb-3"
      onPress={() => router.push(`/e-invoice/${item.id}` as any)}
    >
      <Row justify="between" align="start">
        <View className="flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            {item.receiptNumber ?? item.invoiceNumber}
          </Text>
          <Spacer size={4} />
          {item.buyerName ? (
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {item.buyerName}
            </Text>
          ) : null}
          {item.buyerEmail ? (
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              {item.buyerEmail}
            </Text>
          ) : null}
          <Text
            className="mt-1 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Badge label={item.status} variant={getStatusVariant(item.status)} />
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header title="e-Invoice Requests" onBack={() => router.back()} />
      <View className="px-4">
        {/* Status Filter */}
        <View className="flex-row flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Card
              key={option.value}
              onPress={() => setStatusFilter(option.value)}
              className="px-3 py-2"
              style={
                statusFilter === option.value
                  ? { backgroundColor: theme.colors.primary + "15" }
                  : undefined
              }
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
            </Card>
          ))}
        </View>

        <Spacer size={8} />
        <Text
          className="text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
      />
    </Screen>
  );
}
