import React, { useState, useCallback } from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShoppingBag, CheckCircle } from "lucide-react-native";
import {
  Screen,
  Header,
  Button,
  PriceDisplay,
  QuantitySelector,
  LoadingScreen,
  ErrorScreen,
  Card,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useProduct } from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";
import { useCart } from "@/providers/cart";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { addItem } = useCart();
  const { activeTenantId } = useTimeoAuth();

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product, isLoading } = useProduct(activeTenantId, id);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      currency: product.currency,
      quantity,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, quantity, addItem]);

  if (isLoading) {
    return <LoadingScreen message="Loading product..." />;
  }

  if (!product) {
    return (
      <ErrorScreen
        title="Product not found"
        message="This product may have been removed or is no longer available."
        onRetry={() => router.back()}
      />
    );
  }

  const lineTotal = product.price * quantity;

  return (
    <Screen padded={false}>
      <Header title={product.name} onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Product Image */}
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            className="mx-4 h-64 rounded-2xl"
            resizeMode="cover"
          />
        ) : (
          <View
            className="mx-4 h-64 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <ShoppingBag size={48} color={theme.colors.textSecondary} />
            <Text
              className="mt-2 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {product.name}
            </Text>
          </View>
        )}

        <View className="px-4">
          {/* Product Info */}
          <View className="mt-5">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {product.name}
            </Text>
            <View className="mt-2">
              <PriceDisplay
                amount={product.price}
                currency={product.currency}
                size="lg"
              />
            </View>
          </View>

          <Separator className="my-4" />

          {/* Description */}
          <Card>
            <Text
              className="mb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Description
            </Text>
            <Text
              className="text-base leading-6"
              style={{ color: theme.colors.text }}
            >
              {product.description}
            </Text>
          </Card>

          <Spacer size={16} />

          {/* Quantity Selector */}
          <Card>
            <Text
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Quantity
            </Text>
            <View className="flex-row items-center justify-between">
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={20}
              />
              <View className="items-end">
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Subtotal
                </Text>
                <PriceDisplay
                  amount={lineTotal}
                  currency={product.currency}
                  size="md"
                />
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Sticky Add to Cart Button */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-4"
        style={{
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        }}
      >
        {addedToCart ? (
          <View
            className="flex-row items-center justify-center rounded-xl py-3"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle size={20} color={theme.colors.success} />
            <Text
              className="ml-2 text-base font-semibold"
              style={{ color: theme.colors.success }}
            >
              Added to Cart!
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Total ({quantity} {quantity === 1 ? "item" : "items"})
              </Text>
              <PriceDisplay
                amount={lineTotal}
                currency={product.currency}
                size="lg"
              />
            </View>
            <Button
              size="lg"
              onPress={handleAddToCart}
              style={{ minWidth: 160 }}
            >
              <View className="flex-row items-center">
                <ShoppingBag size={18} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
                <Text
                  className="ml-2 text-base font-semibold"
                  style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
                >
                  Add to Cart
                </Text>
              </View>
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}
