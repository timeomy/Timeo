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
import { Package, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useProducts, useUpdateProduct } from "@timeo/api-client";
import {
  Screen,
  Header,
  SearchInput,
  Switch,
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
  const [refreshing, setRefreshing] = useState(false);

  const { data: products, isLoading, refetch } = useProducts(tenantId);
  const { mutateAsync: updateProduct } = useUpdateProduct(tenantId ?? "");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description ?? "").toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleToggleActive = useCallback(
    async (productId: string, currentIsActive: boolean) => {
      try {
        await updateProduct({ id: productId, isActive: !currentIsActive });
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to toggle product status"
        );
      }
    },
    [updateProduct]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to manage products."
        />
      </Screen>
    );
  }

  if (isLoading && !products) {
    return <LoadingScreen message="Loading products..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title="Products"
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/products/new/edit")}
            className="rounded-full p-2"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View className="px-4 pb-3">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products..."
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No products"
            description="Add your first product to get started."
            icon={<Package size={32} color={theme.colors.textSecondary} />}
            action={{
              label: "Add Product",
              onPress: () => router.push("/products/new/edit"),
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/products/${item.id}/edit`)}
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
                  <PriceDisplay
                    amount={item.price}
                    currency={item.currency}
                    size="sm"
                  />
                </View>
              </View>

              <View className="items-end" style={{ gap: 8 }}>
                <Badge
                  variant={item.isActive ? "success" : "default"}
                  label={item.isActive ? "Active" : "Inactive"}
                />
                <Switch
                  value={item.isActive}
                  onValueChange={() => handleToggleActive(item.id, item.isActive)}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/products/new/edit")}
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: theme.colors.primary, elevation: 8 }}
      >
        <Plus size={28} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
      </TouchableOpacity>
    </Screen>
  );
}
