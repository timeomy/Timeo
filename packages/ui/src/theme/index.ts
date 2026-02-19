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
    primary: "#1A56DB",
    secondary: "#059669",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#1E293B",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    error: "#DC2626",
    success: "#059669",
    warning: "#D97706",
    info: "#2563EB",
  },
  dark: false,
};

export const darkTheme: TimeoTheme = {
  colors: {
    primary: "#3B82F6",
    secondary: "#10B981",
    background: "#0F172A",
    surface: "#1E293B",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#334155",
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
