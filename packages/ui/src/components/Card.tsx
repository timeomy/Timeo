import React from "react";
import { View, TouchableOpacity, type ViewProps } from "react-native";
import { useTheme } from "../theme";

export interface CardProps extends Omit<ViewProps, "style"> {
  variant?: "default" | "outlined" | "elevated";
  onPress?: () => void;
  children: React.ReactNode;
}

export function Card({
  variant = "default",
  onPress,
  children,
  className,
  ...props
}: CardProps) {
  const theme = useTheme();

  const variantClasses = {
    default: "rounded-2xl p-4",
    outlined: "rounded-2xl border p-4",
    elevated: "rounded-2xl p-4 shadow-md",
  };

  const variantStyles = {
    default: { backgroundColor: theme.colors.surface },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    elevated: { backgroundColor: theme.colors.surface },
  };

  const content = (
    <View
      className={`${variantClasses[variant]} ${className ?? ""}`}
      style={variantStyles[variant]}
      {...props}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
