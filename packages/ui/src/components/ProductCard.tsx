import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import { useTheme } from "../theme";
import { PriceDisplay } from "./PriceDisplay";

export interface ProductCardProps {
  name: string;
  description?: string;
  price: number; // cents
  currency?: string;
  image?: string | null;
  inStock?: boolean;
  onPress?: () => void;
  onAddToCart?: () => void;
  className?: string;
}

export function ProductCard({
  name,
  description,
  price,
  currency,
  image,
  inStock = true,
  onPress,
  onAddToCart,
  className,
}: ProductCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      {image ? (
        <Image source={{ uri: image }} className="h-40 w-full" resizeMode="cover" />
      ) : (
        <View
          className="h-40 w-full items-center justify-center"
          style={{ backgroundColor: theme.colors.border }}
        >
          <ShoppingCart size={32} color={theme.colors.textSecondary} />
        </View>
      )}
      <View className="p-3">
        <Text
          className="text-base font-semibold"
          style={{ color: theme.colors.text }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {description ? (
          <Text
            className="mt-0.5 text-sm"
            style={{ color: theme.colors.textSecondary }}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <PriceDisplay amount={price} currency={currency} />
          {onAddToCart && inStock ? (
            <TouchableOpacity
              onPress={onAddToCart}
              className="rounded-full p-2"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <ShoppingCart size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {!inStock ? (
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.error }}
            >
              Out of stock
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
