import React, { useMemo } from "react";
import {
  ThemeContext,
  defaultTheme,
  darkTheme,
  createTenantTheme,
  type TenantBranding,
} from "./index";

export interface ThemeProviderProps {
  children: React.ReactNode;
  dark?: boolean;
  branding?: TenantBranding;
}

export function ThemeProvider({ children, dark, branding }: ThemeProviderProps) {
  const theme = useMemo(() => {
    const base = dark ? darkTheme : defaultTheme;
    return createTenantTheme(base, branding);
  }, [dark, branding]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
