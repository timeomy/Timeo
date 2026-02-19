import React, { useState, useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  SearchInput,
  Avatar,
  Badge,
  Card,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { getInitials, formatRelativeTime } from "@timeo/shared";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");

  const tenantId = activeTenantId as string;

  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const bookings = useQuery(
    api.bookings.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const orders = useQuery(
    api.orders.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const customers = useMemo(() => {
    if (!members) return [];

    // Only include customers
    const customerMembers = members.filter((m) => m.role === "customer");

    // Count bookings and orders per customer
    const bookingCounts = new Map<string, number>();
    const orderCounts = new Map<string, number>();

    if (bookings) {
      for (const b of bookings) {
        bookingCounts.set(
          b.customerId,
          (bookingCounts.get(b.customerId) ?? 0) + 1
        );
      }
    }

    if (orders) {
      for (const o of orders) {
        orderCounts.set(
          o.customerId,
          (orderCounts.get(o.customerId) ?? 0) + 1
        );
      }
    }

    return customerMembers.map((m) => ({
      ...m,
      bookingCount: bookingCounts.get(m.userId) ?? 0,
      orderCount: orderCounts.get(m.userId) ?? 0,
    }));
  }, [members, bookings, orders]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.userName.toLowerCase().includes(q) ||
        c.userEmail.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Customers" onBack={() => router.back()} />
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

  if (members === undefined) {
    return <LoadingScreen message="Loading customers..." />;
  }

  const renderCustomer = ({
    item,
  }: {
    item: (typeof filteredCustomers)[0];
  }) => (
    <Card className="mb-3">
      <Row align="center">
        <Avatar
          src={item.userAvatarUrl}
          fallback={getInitials(item.userName)}
          size="md"
        />
        <View className="ml-3 flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: theme.colors.text }}
            numberOfLines={1}
          >
            {item.userName}
          </Text>
          <Text
            className="text-sm"
            style={{ color: theme.colors.textSecondary }}
            numberOfLines={1}
          >
            {item.userEmail}
          </Text>
        </View>
        <View className="items-end">
          <Row gap={8}>
            <Badge
              label={`${item.bookingCount} bookings`}
              variant="default"
            />
          </Row>
          {item.orderCount > 0 && (
            <Badge
              label={`${item.orderCount} orders`}
              variant="success"
              className="mt-1"
            />
          )}
        </View>
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header title="Customers" onBack={() => router.back()} />
      <View className="px-4">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search customers..."
        />
        <Spacer size={8} />
        <Text
          className="text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          {filteredCustomers.length} customer
          {filteredCustomers.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item._id}
        renderItem={renderCustomer}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
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
      />
    </Screen>
  );
}
