import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShoppingCart,
  Trash2,
  CheckCircle,
  ShoppingBag,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Button,
  PriceDisplay,
  QuantitySelector,
  EmptyState,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useMutation } from "convex/react";
import { useCart } from "../providers/cart";

export default function CartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
    totalItems,
    currency,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const createOrder = useMutation(api.orders.create);

  const handleCheckout = useCallback(async () => {
    if (!activeTenantId || items.length === 0) return;

    Alert.alert(
      "Confirm Order",
      `Place order for ${totalItems} item${totalItems === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Place Order",
          onPress: async () => {
            try {
              setIsCheckingOut(true);
              await createOrder({
                tenantId: activeTenantId as any,
                items: items.map((item) => ({
                  productId: item.productId as any,
                  quantity: item.quantity,
                })),
              });
              setOrderSuccess(true);
              clearCart();
              setTimeout(() => {
                setOrderSuccess(false);
                router.back();
              }, 2000);
            } catch (error: any) {
              Alert.alert(
                "Order Failed",
                error?.message ?? "Unable to place order. Please try again."
              );
            } finally {
              setIsCheckingOut(false);
            }
          },
        },
      ]
    );
  }, [activeTenantId, items, totalItems, createOrder, clearCart, router]);

  const handleRemoveItem = useCallback(
    (productId: string, name: string) => {
      Alert.alert("Remove Item", `Remove "${name}" from cart?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeItem(productId),
        },
      ]);
    },
    [removeItem]
  );

  return (
    <Screen padded={false}>
      <Header
        title="Cart"
        onBack={() => router.back()}
        rightActions={
          items.length > 0 ? (
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Clear Cart", "Remove all items?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: clearCart,
                  },
                ])
              }
            >
              <Trash2 size={20} color={theme.colors.error} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {orderSuccess ? (
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="mb-4 rounded-full p-4"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle size={48} color={theme.colors.success} />
          </View>
          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Order Placed!
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Your order has been submitted successfully. You will receive a
            confirmation shortly.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse products and add items to your cart to get started."
          icon={<ShoppingCart size={32} color={theme.colors.textSecondary} />}
          action={{
            label: "Browse Products",
            onPress: () => {
              router.back();
              router.push("/(tabs)/products");
            },
          }}
        />
      ) : (
        <View className="flex-1">
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 180,
            }}
            ItemSeparatorComponent={() => (
              <View className="py-2">
                <Separator />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View className="flex-row items-center py-3">
                {/* Product Image */}
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    className="h-16 w-16 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="h-16 w-16 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.surface }}
                  >
                    <ShoppingBag
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                )}

                {/* Product Info */}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <PriceDisplay
                    amount={item.price}
                    currency={item.currency}
                    size="sm"
                  />
                  <View className="mt-2 flex-row items-center justify-between">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(val) =>
                        updateQuantity(item.productId, val)
                      }
                      min={0}
                      max={20}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        handleRemoveItem(item.productId, item.name)
                      }
                      className="ml-2 rounded-lg p-2"
                      style={{ backgroundColor: theme.colors.error + "10" }}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Line Total */}
                <View className="ml-2 items-end">
                  <PriceDisplay
                    amount={item.price * item.quantity}
                    currency={item.currency}
                    size="sm"
                  />
                </View>
              </View>
            )}
          />

          {/* Cart Summary & Checkout */}
          <View
            className="absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-4"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            }}
          >
            {/* Summary Row */}
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
              </Text>
              <PriceDisplay
                amount={totalAmount}
                currency={currency}
                size="sm"
              />
            </View>
            <Separator className="my-2" />
            <View className="mb-4 flex-row items-center justify-between">
              <Text
                className="text-base font-bold"
                style={{ color: theme.colors.text }}
              >
                Total
              </Text>
              <PriceDisplay
                amount={totalAmount}
                currency={currency}
                size="lg"
              />
            </View>
            <Button
              size="lg"
              loading={isCheckingOut}
              onPress={handleCheckout}
              className="w-full"
            >
              Checkout
            </Button>
          </View>
        </View>
      )}
    </Screen>
  );
}
