import React, { useState } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";
import { useTheme } from "../theme";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  ...props
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View className={className}>
      {label ? (
        <Text
          className="mb-1.5 text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}
      <View
        className="flex-row items-center rounded-xl border px-3"
        style={{ borderColor, backgroundColor: theme.colors.surface }}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          className="flex-1 py-3 text-base"
          style={{ color: theme.colors.text }}
          placeholderTextColor={theme.colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text
          className="mt-1 text-sm"
          style={{ color: theme.colors.error }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
