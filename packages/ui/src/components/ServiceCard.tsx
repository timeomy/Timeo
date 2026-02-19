import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Clock } from "lucide-react-native";
import { useTheme } from "../theme";
import { PriceDisplay } from "./PriceDisplay";
import { Button } from "./Button";

export interface ServiceCardProps {
  name: string;
  description?: string;
  duration: number; // minutes
  price: number; // cents
  currency?: string;
  image?: string | null;
  onPress?: () => void;
  onBook?: () => void;
  className?: string;
}

export function ServiceCard({
  name,
  description,
  duration,
  price,
  currency,
  image,
  onPress,
  onBook,
  className,
}: ServiceCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`flex-row rounded-2xl p-3 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          className="mr-3 h-20 w-20 rounded-xl"
        />
      ) : null}
      <View className="flex-1">
        <Text
          className="text-base font-semibold"
          style={{ color: theme.colors.text }}
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
        <View className="mt-2 flex-row items-center">
          <Clock size={14} color={theme.colors.textSecondary} />
          <Text
            className="ml-1 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {duration} min
          </Text>
          <View className="mx-2 h-1 w-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
          <PriceDisplay amount={price} currency={currency} size="sm" />
        </View>
      </View>
      {onBook ? (
        <View className="ml-2 justify-center">
          <Button size="sm" onPress={onBook}>
            Book
          </Button>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
