import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({
  orientation = "horizontal",
  className,
}: SeparatorProps) {
  const theme = useTheme();

  return (
    <View
      className={`${orientation === "horizontal" ? "h-px w-full" : "h-full w-px"} ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.border }}
    />
  );
}
