import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider } from "@timeo/auth";
import { ThemeProvider, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useCallback } from "react";

function PushRegistration() {
  const registerPushToken = useMutation(api.notifications.registerPushToken);
  const handleRegister = useCallback(
    async (token: string, platform: "ios" | "android") => {
      await registerPushToken({ token, platform });
    },
    [registerPushToken]
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
      <TimeoAuthProvider
        convexUrl={Constants.expoConfig?.extra?.convexUrl ?? ""}
      >
        <ThemeProvider>
          <PushRegistration />
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
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
    </TimeoAnalyticsProvider>
  );
}
