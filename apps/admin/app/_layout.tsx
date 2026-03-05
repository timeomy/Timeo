import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider } from "@timeo/auth";
import { ThemeProvider, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function PushRegistration() {
  const handleRegister = useCallback(
    async (_token: string, _platform: "ios" | "android") => {
      // Push token registration handled server-side
    },
    []
  );
  usePushNotifications(handleRegister);
  return null;
}

export default function RootLayout() {
  return (
    <TimeoAnalyticsProvider
      apiKey={Constants.expoConfig?.extra?.posthogKey ?? ""}
      host={Constants.expoConfig?.extra?.posthogHost}
    >
      <QueryClientProvider client={queryClient}>
        <TimeoAuthProvider>
          <ThemeProvider dark>
            <PushRegistration />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="staff/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="staff/invite"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="customers/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="memberships/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="memberships/[id]/edit"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="notifications/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="gift-cards/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="gift-cards/create"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="gift-cards/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="analytics/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="payments/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="e-invoice/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="e-invoice/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="vouchers/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="vouchers/create"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="vouchers/[id]"
                options={{ presentation: "card" }}
              />
            </Stack>
          </ThemeProvider>
        </TimeoAuthProvider>
      </QueryClientProvider>
    </TimeoAnalyticsProvider>
  );
}
