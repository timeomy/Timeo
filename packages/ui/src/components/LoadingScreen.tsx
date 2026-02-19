import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "../theme";

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const theme = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: theme.colors.background }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? (
        <Text
          className="mt-4 text-base"
          style={{ color: theme.colors.textSecondary }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
