import React from "react";
import { View } from "react-native";

export interface SpacerProps {
  size?: number;
  flex?: boolean;
  className?: string;
}

export function Spacer({ size, flex = false, className }: SpacerProps) {
  if (flex) {
    return <View className={`flex-1 ${className ?? ""}`} />;
  }
  return <View style={{ height: size, width: size }} className={className} />;
}
