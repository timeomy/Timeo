import React, { useState, useMemo, useCallback } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag } from "lucide-react-native";
import {
  Screen,
  Header,
  SearchInput,
  ProductCard,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { useCart } from "../providers/cart";

export default function ProductsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const products = useQuery(
    api.products.list,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const query = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [products, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (products === undefined) {
    return <LoadingScreen message="Loading products..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Products" />
      <View className="px-4 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
        />
      </View>

      {filteredProducts.length === 0 ? (
        <EmptyState
          title={search ? "No results found" : "No products available"}
          description={
            search
              ? `No products match "${search}". Try a different search.`
              : "This business hasn't added any products yet."
          }
          icon={<ShoppingBag size={32} color={theme.colors.textSecondary} />}
          action={
            search
              ? { label: "Clear Search", onPress: () => setSearch("") }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View className="flex-1">
              <ProductCard
                name={item.name}
                description={item.description}
                price={item.price}
                currency={item.currency}
                image={item.imageUrl}
                onPress={() => router.push(`/products/${item._id}` as any)}
                onAddToCart={() =>
                  addItem({
                    productId: item._id,
                    name: item.name,
                    price: item.price,
                    image: item.imageUrl,
                    currency: item.currency,
                  })
                }
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}
