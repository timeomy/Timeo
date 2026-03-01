import { useState, useMemo } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useStaffMembers, useBookings, useOrders } from "@timeo/api-client";
import {
  Screen,
  Header,
  SearchInput,
  Avatar,
  Badge,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [search, setSearch] = useState("");

  const { data: members, isLoading: loadingMembers, refetch, isRefetching } = useStaffMembers(tenantId);
  const { data: bookings } = useBookings(tenantId);
  const { data: orders } = useOrders(tenantId);

  const customers = useMemo(() => {
    if (!members) return [];
    const customerMembers = members.filter((m) => m.role === "customer");

    const bookingCounts = new Map<string, number>();
    const orderCounts = new Map<string, number>();

    if (bookings) {
      for (const b of bookings) {
        bookingCounts.set(b.customerId, (bookingCounts.get(b.customerId) ?? 0) + 1);
      }
    }
    if (orders) {
      for (const o of orders) {
        if (o.customerId) {
          orderCounts.set(o.customerId, (orderCounts.get(o.customerId) ?? 0) + 1);
        }
      }
    }

    return customerMembers.map((m) => ({
      ...m,
      bookingCount: bookingCounts.get(m.userId) ?? 0,
      orderCount: orderCounts.get(m.userId) ?? 0,
    }));
  }, [members, bookings, orders]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [customers, search]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Customers" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (loadingMembers) {
    return <LoadingScreen message="Loading customers..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Customers" onBack={() => router.back()} />

      <View className="px-4">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search customers..." />
        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No customers found"
            description={
              search
                ? "Try a different search term."
                : "Customers will appear here once they sign up."
            }
            icon={<Users size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center">
              <Avatar fallback={getInitials(item.name)} size="md" />
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>
              </View>
              <View className="items-end" style={{ gap: 4 }}>
                <Badge label={`${item.bookingCount} bookings`} variant="default" />
                {item.orderCount > 0 && (
                  <Badge label={`${item.orderCount} orders`} variant="success" />
                )}
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
