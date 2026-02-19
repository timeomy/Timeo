import React from "react";
import { View, Text, Image } from "react-native";
import { useTheme } from "../theme";

export interface AvatarProps {
  src?: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
};

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 56,
};

export function Avatar({
  src,
  fallback = "?",
  size = "md",
  className,
}: AvatarProps) {
  const theme = useTheme();

  const initials = fallback
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        className={`rounded-full ${sizeClasses[size]} ${className ?? ""}`}
        style={{
          width: imageSizes[size],
          height: imageSizes[size],
        }}
      />
    );
  }

  return (
    <View
      className={`items-center justify-center rounded-full ${sizeClasses[size]} ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.primary + "20" }}
    >
      <Text
        className={`font-semibold ${textSizes[size]}`}
        style={{ color: theme.colors.primary }}
      >
        {initials}
      </Text>
    </View>
  );
}
