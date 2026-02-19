import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View className={`items-center px-8 py-12 ${className ?? ""}`}>
      {icon ? (
        <View
          className="mb-4 rounded-full p-4"
          style={{ backgroundColor: theme.colors.surface }}
        >
          {icon}
        </View>
      ) : null}
      <Text
        className="text-center text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className="mt-2 text-center text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          {description}
        </Text>
      ) : null}
      {action ? (
        <View className="mt-6">
          <Button onPress={action.onPress}>{action.label}</Button>
        </View>
      ) : null}
    </View>
  );
}
