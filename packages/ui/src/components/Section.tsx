import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme";

export interface SectionProps {
  title: string;
  seeAll?: {
    label?: string;
    onPress: () => void;
  };
  children: React.ReactNode;
  className?: string;
}

export function Section({
  title,
  seeAll,
  children,
  className,
}: SectionProps) {
  const theme = useTheme();

  return (
    <View className={`mt-6 ${className ?? ""}`}>
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          {title}
        </Text>
        {seeAll ? (
          <TouchableOpacity onPress={seeAll.onPress}>
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.primary }}
            >
              {seeAll.label ?? "See all"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}
