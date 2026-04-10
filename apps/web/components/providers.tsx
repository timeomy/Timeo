"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient, TimeoWebAuthProvider } from "@timeo/auth/web";
import { TimeoWebAnalyticsProvider } from "@timeo/analytics/web";
import { useMyTenants } from "@timeo/api-client";
import { RouteProgress } from "@/route-progress";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "timeo-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }

  return theme;
}

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
    return savedTheme;
  }

  return "system";
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const preferredTheme = readThemePreference();
    setTheme(preferredTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const syncTheme = () => {
      const nextResolvedTheme = resolveTheme(theme, mediaQuery.matches);
      setResolvedTheme(nextResolvedTheme);
      applyResolvedTheme(nextResolvedTheme);
    };

    syncTheme();
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    const handleMediaChange = () => {
      if (theme === "system") {
        syncTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaChange);
      return () => {
        mediaQuery.removeEventListener("change", handleMediaChange);
      };
    }

    mediaQuery.addListener(handleMediaChange);
    return () => {
      mediaQuery.removeListener(handleMediaChange);
    };
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const currentResolvedTheme = currentTheme === "system" ? resolvedTheme : currentTheme;
      return currentResolvedTheme === "dark" ? "light" : "dark";
    });
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      mounted,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, mounted, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Loads tenant list and wires it into the auth provider. Must be inside QueryClientProvider. */
function TenantsLoader({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id ?? null;
  const isSignedIn = !!session.data?.user;
  const { tenants, platformRole, isLoading } = useMyTenants({
    enabled: isSignedIn,
    userId,
  });

  const tenantsLoading = session.isPending || (isSignedIn && isLoading);

  return (
    <TimeoWebAuthProvider tenants={tenants} tenantsLoading={tenantsLoading} platformRole={platformRole}>
      {children}
    </TimeoWebAuthProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TimeoWebAnalyticsProvider
        apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""}
        host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
      >
        <QueryClientProvider client={queryClient}>
          <RouteProgress />
          <TenantsLoader>{children}</TenantsLoader>
        </QueryClientProvider>
      </TimeoWebAnalyticsProvider>
    </ThemeProvider>
  );
}
