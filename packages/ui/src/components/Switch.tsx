import React from "react";
import { View, Text, Switch as RNSwitch } from "react-native";
import { useTheme } from "../theme";

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export function Switch({
  value,
  onValueChange,
  label,
  className,
}: SwitchProps) {
  const theme = useTheme();

  return (
    <View className={`flex-row items-center justify-between ${className ?? ""}`}>
      {label ? (
        <Text
          className="flex-1 text-base"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary + "80",
        }}
        thumbColor={value ? theme.colors.primary : "#FFFFFF"}
      />
    </View>
  );
}
