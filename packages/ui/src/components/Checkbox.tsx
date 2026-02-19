import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "../theme";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: CheckboxProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onChange(!checked)}
      className={`flex-row items-center ${className ?? ""}`}
    >
      <View
        className="h-5 w-5 items-center justify-center rounded border-2"
        style={{
          borderColor: checked ? theme.colors.primary : theme.colors.border,
          backgroundColor: checked ? theme.colors.primary : "transparent",
        }}
      >
        {checked ? <Check size={14} color="#FFFFFF" /> : null}
      </View>
      {label ? (
        <Text
          className="ml-3 text-base"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
