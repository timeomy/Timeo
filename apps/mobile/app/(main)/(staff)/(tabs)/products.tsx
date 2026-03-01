import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Package } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useProducts } from "@timeo/api-client";
import {
  Screen,
  Header,
  SearchInput,
  PriceDisplay,
  Badge,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

export default function ProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading, refetch, isRefetching } = useProducts(tenantId);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization to manage products." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading products..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Products" />

      <View className="px-4 pb-3">
        <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search products..." />
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No products"
            description="Add your first product to get started."
            icon={<Package size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/products/${item.id}/edit` as any)}
            activeOpacity={0.7}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    className="mt-0.5 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <View className="mt-2">
                  <PriceDisplay amount={item.price} currency={item.currency} size="sm" />
                </View>
              </View>
              <View className="items-end" style={{ gap: 8 }}>
                <Badge
                  variant={item.isActive ? "success" : "default"}
                  label={item.isActive ? "Active" : "Inactive"}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
