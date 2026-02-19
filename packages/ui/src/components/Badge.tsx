import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";

export interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  label: string;
  className?: string;
}

export function Badge({
  variant = "default",
  label,
  className,
}: BadgeProps) {
  const theme = useTheme();

  const colorMap = {
    default: {
      bg: theme.colors.primary + "20",
      text: theme.colors.primary,
    },
    success: {
      bg: theme.colors.success + "20",
      text: theme.colors.success,
    },
    warning: {
      bg: theme.colors.warning + "20",
      text: theme.colors.warning,
    },
    error: {
      bg: theme.colors.error + "20",
      text: theme.colors.error,
    },
    info: {
      bg: theme.colors.info + "20",
      text: theme.colors.info,
    },
  };

  const colors = colorMap[variant];

  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${className ?? ""}`}
      style={{ backgroundColor: colors.bg }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: colors.text }}
      >
        {label}
      </Text>
    </View>
  );
}
