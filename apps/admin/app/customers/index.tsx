import React, { useState, useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  SearchInput,
  Badge,
  Card,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { formatPrice } from "@timeo/shared";
import { useCustomers } from "@timeo/api-client";

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");

  const tenantId = activeTenantId as string;

  const { data: customers, isLoading } = useCustomers(tenantId);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
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

  if (isLoading) {
    return <LoadingScreen message="Loading customers..." />;
  }

  const renderCustomer = ({
    item,
  }: {
    item: NonNullable<typeof customers>[0];
  }) => (
    <Card className="mb-3">
      <Row align="center">
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
        <View className="items-end">
          <Row gap={8}>
            <Badge
              label={`${item.bookingCount} bookings`}
              variant="default"
            />
          </Row>
          {item.totalSpend > 0 && (
            <Badge
              label={formatPrice(item.totalSpend)}
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
        keyExtractor={(item) => item.id}
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
