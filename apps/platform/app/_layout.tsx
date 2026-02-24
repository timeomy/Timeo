import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider, useTimeoAuth } from "@timeo/auth";
import { ThemeProvider, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useCallback, useEffect } from "react";

function EnsureUser() {
  const { isSignedIn } = useTimeoAuth();
  const ensureUser = useMutation(api.auth.ensureUser);

  useEffect(() => {
    if (isSignedIn) {
      ensureUser({}).catch(() => {});
    }
  }, [isSignedIn, ensureUser]);

  return null;
}

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
        <ThemeProvider dark>
          <EnsureUser />
          <PushRegistration />
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
    </TimeoAnalyticsProvider>
  );
}
