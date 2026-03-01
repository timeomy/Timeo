import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Gift } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useGiftCards } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

type StatusFilter = "all" | "active" | "fully_used" | "expired" | "cancelled";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Depleted", value: "fully_used" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
];

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "fully_used":
      return "warning";
    case "expired":
    case "cancelled":
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
  });
}

export default function GiftCardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: giftCards, isLoading, refetch, isRefetching } = useGiftCards(tenantId);

  const filteredCards = useMemo(() => {
    if (!giftCards) return [];
    if (statusFilter === "all") return giftCards;
    return giftCards.filter((c) => c.status === statusFilter);
  }, [giftCards, statusFilter]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Gift Cards" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading gift cards..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Gift Cards" onBack={() => router.back()} />

      <View className="px-4">
        {/* Status Filter */}
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
          {filteredCards.length} gift card{filteredCards.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>

      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
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
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text, fontFamily: "monospace" }}
                >
                  {item.code}
                </Text>
                <View className="mt-1">
                  <Badge
                    label={item.status ?? (item.isActive ? "active" : "inactive")}
                    variant={getStatusVariant(item.status ?? (item.isActive ? "active" : "inactive"))}
                  />
                </View>
                {item.purchaserName && (
                  <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                    From: {item.purchaserName}
                  </Text>
                )}
                {item.recipientName && (
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    To: {item.recipientName}
                  </Text>
                )}
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  RM {(item.currentBalance / 100).toFixed(2)}
                </Text>
                {item.currentBalance !== item.initialBalance && (
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    of RM {(item.initialBalance / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
