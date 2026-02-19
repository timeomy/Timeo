import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Package } from "lucide-react-native";
import { useTheme } from "../theme";
import { StatusBadge } from "./StatusBadge";
import { PriceDisplay } from "./PriceDisplay";
import { DateTimeDisplay } from "./DateTimeDisplay";

export interface OrderCardProps {
  orderNumber: string;
  status: string;
  totalAmount: number; // cents
  currency?: string;
  itemCount: number;
  createdAt: number; // unix ms
  onPress?: () => void;
  className?: string;
}

export function OrderCard({
  orderNumber,
  status,
  totalAmount,
  currency,
  itemCount,
  createdAt,
  onPress,
  className,
}: OrderCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`rounded-2xl p-4 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center">
          <View
            className="mr-3 rounded-xl p-2.5"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <Package size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              Order #{orderNumber}
            </Text>
            <Text
              className="mt-0.5 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>
        <StatusBadge status={status} />
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderColor: theme.colors.border }}>
        <DateTimeDisplay timestamp={createdAt} />
        <PriceDisplay amount={totalAmount} currency={currency} />
      </View>
    </TouchableOpacity>
  );
}
