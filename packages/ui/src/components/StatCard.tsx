import React from "react";
import { View, Text } from "react-native";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { useTheme } from "../theme";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number; // percentage
    direction: "up" | "down";
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
}: StatCardProps) {
  const theme = useTheme();

  return (
    <View
      className={`rounded-2xl p-4 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-sm font-medium"
          style={{ color: theme.colors.textSecondary }}
        >
          {label}
        </Text>
        {icon ?? null}
      </View>
      <Text
        className="mt-2 text-2xl font-bold"
        style={{ color: theme.colors.text }}
      >
        {value}
      </Text>
      {trend ? (
        <View className="mt-1 flex-row items-center">
          {trend.direction === "up" ? (
            <TrendingUp size={14} color={theme.colors.success} />
          ) : (
            <TrendingDown size={14} color={theme.colors.error} />
          )}
          <Text
            className="ml-1 text-sm font-medium"
            style={{
              color:
                trend.direction === "up"
                  ? theme.colors.success
                  : theme.colors.error,
            }}
          >
            {trend.value}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}
