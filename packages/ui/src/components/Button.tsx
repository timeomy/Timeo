import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { useTheme } from "../theme";

export interface ButtonProps extends Omit<TouchableOpacityProps, "children"> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2.5",
  lg: "px-6 py-3.5",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  variant = "default",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const isDisabled = disabled || loading;

  const variantClasses = {
    default: "rounded-xl",
    outline: "rounded-xl border",
    ghost: "rounded-xl",
    destructive: "rounded-xl",
  };

  const variantStyles = {
    default: { backgroundColor: theme.colors.primary },
    outline: {
      backgroundColor: "transparent",
      borderColor: theme.colors.border,
    },
    ghost: { backgroundColor: "transparent" },
    destructive: { backgroundColor: theme.colors.error },
  };

  const textColors = {
    default: "#FFFFFF",
    outline: theme.colors.text,
    ghost: theme.colors.primary,
    destructive: "#FFFFFF",
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      style={variantStyles[variant]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColors[variant]}
          className="mr-2"
        />
      ) : null}
      {typeof children === "string" ? (
        <Text
          className={`font-semibold ${textSizeClasses[size]}`}
          style={{ color: textColors[variant] }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
