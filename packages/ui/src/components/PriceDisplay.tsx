import React from "react";
import { Text } from "react-native";
import { useTheme } from "../theme";

export interface PriceDisplayProps {
  amount: number; // in cents
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const currencySymbols: Record<string, string> = {
  MYR: "RM",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  SGD: "S$",
  JPY: "\u00A5",
};

export function PriceDisplay({
  amount,
  currency = "MYR",
  className,
  size = "md",
}: PriceDisplayProps) {
  const theme = useTheme();
  const symbol = currencySymbols[currency] ?? currency;
  const formatted = (amount / 100).toFixed(currency === "JPY" ? 0 : 2);

  return (
    <Text
      className={`font-bold ${sizeClasses[size]} ${className ?? ""}`}
      style={{ color: theme.colors.text }}
    >
      {symbol} {formatted}
    </Text>
  );
}
