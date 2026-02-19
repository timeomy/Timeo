import React from "react";
import { View, ScrollView, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native";
import { useTheme } from "../theme";

export interface ScreenProps extends Omit<ViewProps, "style"> {
  scroll?: boolean;
  padded?: boolean;
  children: React.ReactNode;
}

export function Screen({
  scroll = false,
  padded = true,
  children,
  className,
  ...props
}: ScreenProps) {
  const theme = useTheme();

  const content = scroll ? (
    <ScrollView
      className={`flex-1 ${padded ? "px-4" : ""}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${padded ? "px-4" : ""}`} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.background }}
    >
      {content}
    </SafeAreaView>
  );
}
