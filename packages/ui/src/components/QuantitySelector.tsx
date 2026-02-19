import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useTheme } from "../theme";

export interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
  className,
}: QuantitySelectorProps) {
  const theme = useTheme();
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View className={`flex-row items-center ${className ?? ""}`}>
      <TouchableOpacity
        onPress={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        className="h-8 w-8 items-center justify-center rounded-lg border"
        style={{
          borderColor: theme.colors.border,
          opacity: canDecrease ? 1 : 0.4,
        }}
      >
        <Minus size={16} color={theme.colors.text} />
      </TouchableOpacity>
      <Text
        className="mx-4 min-w-[24px] text-center text-base font-semibold"
        style={{ color: theme.colors.text }}
      >
        {value}
      </Text>
      <TouchableOpacity
        onPress={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={{
          backgroundColor: theme.colors.primary,
          opacity: canIncrease ? 1 : 0.4,
        }}
      >
        <Plus size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
