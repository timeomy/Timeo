import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Gift, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

type StatusFilter = "all" | "active" | "depleted" | "expired" | "cancelled";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Depleted", value: "depleted" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
];

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
  });
}

export default function GiftCardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as string;

  const giftCards = useQuery(
    api.giftCards.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const filteredCards = useMemo(() => {
    if (!giftCards) return [];
    if (statusFilter === "all") return giftCards;
    return giftCards.filter((c) => c.status === statusFilter);
  }, [giftCards, statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Gift Cards" onBack={() => router.back()} />
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
    return <LoadingScreen message="Loading gift cards..." />;
  }

  const renderCard = ({ item }: { item: (typeof filteredCards)[0] }) => (
    <Card
      className="mb-3"
      onPress={() => router.push(`/gift-cards/${item._id}` as any)}
    >
      <Row justify="between" align="start">
        <View className="flex-1">
          <Text
            className="text-base font-bold"
            style={{ color: theme.colors.text, fontFamily: "monospace" }}
          >
            {item.code}
          </Text>
          <Spacer size={4} />
          <Badge label={item.status} variant={getStatusVariant(item.status)} />
          <Spacer size={6} />
          {item.purchaserName ? (
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              From: {item.purchaserName}
            </Text>
          ) : null}
          {item.recipientName ? (
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              To: {item.recipientName}
            </Text>
          ) : null}
          <Text
            className="mt-1 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            RM {(item.currentBalance / 100).toFixed(2)}
          </Text>
          {item.currentBalance !== item.initialBalance && (
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              of RM {(item.initialBalance / 100).toFixed(2)}
            </Text>
          )}
        </View>
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header title="Gift Cards" onBack={() => router.back()} />
      <View className="px-4">
        <Button onPress={() => router.push("/gift-cards/create" as any)}>
          <Row align="center" gap={8}>
            <Plus size={18} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
            <Text className="text-base font-semibold" style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}>
              Issue New Gift Card
            </Text>
          </Row>
        </Button>
        <Spacer size={12} />

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
          {filteredCards.length} gift card{filteredCards.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item._id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No gift cards found"
            description={
              statusFilter !== "all"
                ? "Try changing the filter."
                : "Issue your first gift card to get started."
            }
            icon={<Gift size={32} color={theme.colors.textSecondary} />}
          />
        }
      />
    </Screen>
  );
}
