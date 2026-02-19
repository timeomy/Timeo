export const DEFAULT_CURRENCY = "MYR";
export const CURRENCY_SYMBOL: Record<string, string> = {
  MYR: "RM",
  USD: "$",
  SGD: "S$",
};

export const APP_NAME = "Timeo";

export const THEME_DEFAULTS = {
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
} as const;
