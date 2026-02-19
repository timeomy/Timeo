import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  OrderCard,
  Button,
  SearchInput,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";
import { OrderStatus } from "@timeo/shared";
const STATUS_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Completed",
] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_TO_STATUS: Record<StatusTab, string | null> = {
  All: null,
  Pending: OrderStatus.PENDING,
  Confirmed: OrderStatus.CONFIRMED,
  Preparing: OrderStatus.PREPARING,
  Ready: OrderStatus.READY,
  Completed: OrderStatus.COMPLETED,
};

// Next valid status for progression
const NEXT_STATUS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending: "Confirm",
  confirmed: "Prepare",
  preparing: "Mark Ready",
  ready: "Complete",
};

export default function OrdersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any | null;

  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const orders = useQuery(
    api.orders.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const updateStatus = useMutation(api.orders.updateStatus);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let filtered = orders;

    // Filter by status tab
    const statusFilter = TAB_TO_STATUS[activeTab];
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customerName.toLowerCase().includes(query) ||
          o._id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, activeTab, searchQuery]);

  const handleAdvanceStatus = useCallback(
    async (orderId: any, currentStatus: string) => {
      const nextStatus = NEXT_STATUS[currentStatus];
      if (!nextStatus) return;

      try {
        await updateStatus({
          orderId,
          status: nextStatus as
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready"
            | "completed"
            | "cancelled",
        });
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to update order status"
        );
      }
    },
    [updateStatus]
  );

  const handleCancelOrder = useCallback(
    (orderId: any) => {
      Alert.alert(
        "Cancel Order",
        "Are you sure you want to cancel this order?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                await updateStatus({
                  orderId,
                  status: "cancelled",
                });
              } catch (err) {
                Alert.alert(
                  "Error",
                  err instanceof Error
                    ? err.message
                    : "Failed to cancel order"
                );
              }
            },
          },
        ]
      );
    },
    [updateStatus]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to view orders."
        />
      </Screen>
    );
  }

  if (orders === undefined) {
    return <LoadingScreen message="Loading orders..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Orders" />

      {/* Search */}
      <View className="px-4 pb-2">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search orders..."
        />
      </View>

      {/* Status Tabs */}
      <View className="px-4 pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isActive = item === activeTab;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.surface,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isActive ? "#FFFFFF" : theme.colors.textSecondary,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No orders found"
            description={
              activeTab === "All"
                ? "There are no orders yet."
                : `No ${activeTab.toLowerCase()} orders.`
            }
            icon={
              <ClipboardList size={32} color={theme.colors.textSecondary} />
            }
          />
        }
        renderItem={({ item }) => {
          const nextStatusLabel = NEXT_STATUS_LABEL[item.status];
          const canCancel =
            item.status !== "completed" && item.status !== "cancelled";

          return (
            <View>
              <OrderCard
                orderNumber={item._id.slice(-6).toUpperCase()}
                status={item.status}
                totalAmount={item.totalAmount}
                currency={item.currency}
                itemCount={item.itemCount}
                createdAt={item.createdAt}
                onPress={() => router.push(`/orders/${item._id}`)}
              />
              {/* Action buttons */}
              {(nextStatusLabel || canCancel) && (
                <View className="mt-1 flex-row px-1" style={{ gap: 8 }}>
                  {nextStatusLabel && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onPress={() =>
                        handleAdvanceStatus(
                          item._id as any,
                          item.status
                        )
                      }
                    >
                      {nextStatusLabel}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onPress={() =>
                        handleCancelOrder(item._id as any)
                      }
                    >
                      Cancel
                    </Button>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}
