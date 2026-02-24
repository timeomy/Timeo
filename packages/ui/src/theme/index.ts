import { createContext, useContext } from "react";

export interface TimeoTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  dark: boolean;
}

export const defaultTheme: TimeoTheme = {
  colors: {
    primary: "#D4970A",
    secondary: "#059669",
    background: "#FAFAF8",
    surface: "#F0F0EC",
    text: "#0B0B0F",
    textSecondary: "#64748B",
    border: "#E0E0DC",
    error: "#DC2626",
    success: "#059669",
    warning: "#D97706",
    info: "#2563EB",
  },
  dark: false,
};

export const darkTheme: TimeoTheme = {
  colors: {
    primary: "#FFB300",
    secondary: "#10B981",
    background: "#0B0B0F",
    surface: "#131318",
    text: "#EDECE8",
    textSecondary: "#88878F",
    border: "#252530",
    error: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    info: "#3B82F6",
  },
  dark: true,
};

export interface TenantBranding {
  primary?: string;
  secondary?: string;
}

export function createTenantTheme(
  base: TimeoTheme,
  branding?: TenantBranding
): TimeoTheme {
  if (!branding) return base;
  return {
    ...base,
    colors: {
      ...base.colors,
      ...(branding.primary && { primary: branding.primary }),
      ...(branding.secondary && { secondary: branding.secondary }),
    },
  };
}

export const ThemeContext = createContext<TimeoTheme>(defaultTheme);

export function useTheme(): TimeoTheme {
  return useContext(ThemeContext);
}
