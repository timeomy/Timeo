import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider } from "@timeo/auth";
import { ThemeProvider } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <TimeoAnalyticsProvider
      apiKey={Constants.expoConfig?.extra?.posthogKey ?? ""}
      host={Constants.expoConfig?.extra?.posthogHost}
    >
      <QueryClientProvider client={queryClient}>
        <TimeoAuthProvider>
          <ThemeProvider dark>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="tenants/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="tenants/new"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="flags/[key]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="logs/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="notifications/index"
                options={{ presentation: "card" }}
              />
            </Stack>
          </ThemeProvider>
        </TimeoAuthProvider>
      </QueryClientProvider>
    </TimeoAnalyticsProvider>
  );
}
