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
        publishableKey={Constants.expoConfig?.extra?.clerkPublishableKey ?? ""}
        convexUrl={Constants.expoConfig?.extra?.convexUrl ?? ""}
      >
        <ThemeProvider>
          <PushRegistration />
          <StatusBar style="auto" />
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
    </TimeoAnalyticsProvider>
  );
}
