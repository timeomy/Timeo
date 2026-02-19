import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme";

export interface RadioOption {
  label: string;
  value: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  label,
  className,
}: RadioGroupProps) {
  const theme = useTheme();

  return (
    <View className={className}>
      {label ? (
        <Text
          className="mb-2 text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-row items-center py-2"
          >
            <View
              className="h-5 w-5 items-center justify-center rounded-full border-2"
              style={{
                borderColor: selected
                  ? theme.colors.primary
                  : theme.colors.border,
              }}
            >
              {selected ? (
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              ) : null}
            </View>
            <Text
              className="ml-3 text-base"
              style={{ color: theme.colors.text }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
