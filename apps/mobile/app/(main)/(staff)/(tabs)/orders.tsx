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
import { useTimeoAuth } from "@timeo/auth";
import { useOrders, useUpdateOrderStatus } from "@timeo/api-client";
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

const STATUS_TABS = ["All", "Pending", "Confirmed", "Preparing", "Ready", "Completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_TO_STATUS: Record<StatusTab, string | null> = {
  All: null,
  Pending: OrderStatus.PENDING,
  Confirmed: OrderStatus.CONFIRMED,
  Preparing: OrderStatus.PREPARING,
  Ready: OrderStatus.READY,
  Completed: OrderStatus.COMPLETED,
};

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
  const tenantId = activeTenantId as string;

  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders, isLoading, refetch, isRefetching } = useOrders(tenantId);
  const updateStatus = useUpdateOrderStatus(tenantId ?? "");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;
    const statusFilter = TAB_TO_STATUS[activeTab];
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [orders, activeTab, searchQuery]);

  const handleAdvanceStatus = useCallback(
    async (orderId: string, currentStatus: string) => {
      const nextStatus = NEXT_STATUS[currentStatus];
      if (!nextStatus) return;
      try {
        await updateStatus.mutateAsync({ orderId, status: nextStatus });
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to update order status");
      }
    },
    [updateStatus]
  );

  const handleCancelOrder = useCallback(
    (orderId: string) => {
      Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ orderId, status: "cancelled" });
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to cancel order");
            }
          },
        },
      ]);
    },
    [updateStatus]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization to view orders." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading orders..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Orders" />

      <View className="px-4 pb-2">
        <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search orders..." />
      </View>

      <View className="px-4 pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS as unknown as StatusTab[]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isActive = item === activeTab;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isActive ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.textSecondary,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No orders found"
            description={activeTab === "All" ? "There are no orders yet." : `No ${activeTab.toLowerCase()} orders.`}
            icon={<ClipboardList size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => {
          const nextStatusLabel = NEXT_STATUS_LABEL[item.status];
          const canCancel = item.status !== "completed" && item.status !== "cancelled";
          return (
            <View>
              <OrderCard
                orderNumber={item.id.slice(-6).toUpperCase()}
                status={item.status}
                totalAmount={item.totalAmount}
                currency={item.currency}
                itemCount={item.itemCount}
                createdAt={new Date(item.createdAt).getTime()}
                onPress={() => router.push(`/orders/${item.id}`)}
              />
              {(nextStatusLabel || canCancel) && (
                <View className="mt-1 flex-row px-1" style={{ gap: 8 }}>
                  {nextStatusLabel && (
                    <Button size="sm" onPress={() => handleAdvanceStatus(item.id, item.status)}>
                      {nextStatusLabel}
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="destructive" size="sm" onPress={() => handleCancelOrder(item.id)}>
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
