import React from "react";
import { View, Text } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { useTheme } from "../theme";
import { Button } from "./Button";

export interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorScreenProps) {
  const theme = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.colors.background }}
    >
      <View
        className="mb-4 rounded-full p-4"
        style={{ backgroundColor: theme.colors.error + "15" }}
      >
        <AlertTriangle size={32} color={theme.colors.error} />
      </View>
      <Text
        className="text-center text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        {title}
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: theme.colors.textSecondary }}
      >
        {message}
      </Text>
      {onRetry ? (
        <View className="mt-6">
          <Button onPress={onRetry}>Try Again</Button>
        </View>
      ) : null}
    </View>
  );
}
