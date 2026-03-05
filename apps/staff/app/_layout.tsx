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
    <QueryClientProvider client={queryClient}>
      <TimeoAnalyticsProvider
        apiKey={Constants.expoConfig?.extra?.posthogKey ?? ""}
        host={Constants.expoConfig?.extra?.posthogHost}
      >
        <TimeoAuthProvider>
          <ThemeProvider dark>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="bookings/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="products/[id]/edit"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="services/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="services/[id]/edit"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="orders/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="notifications/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="check-ins/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="check-ins/scan"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="session-logs/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="session-logs/create"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="gift-cards/redeem"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="pos/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="pos/new"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="pos/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="schedule/index"
                options={{ presentation: "card" }}
              />
            </Stack>
          </ThemeProvider>
        </TimeoAuthProvider>
      </TimeoAnalyticsProvider>
    </QueryClientProvider>
  );
}
