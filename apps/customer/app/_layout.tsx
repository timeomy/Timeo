import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider, useTimeoAuth } from "@timeo/auth";
import { ThemeProvider, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { CartProvider } from "./providers/cart";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useCallback } from "react";
import { View, Text } from "react-native";

const clerkKey = Constants.expoConfig?.extra?.clerkPublishableKey ?? "";
const convexUrl = Constants.expoConfig?.extra?.convexUrl ?? "";

function PushRegistration() {
  const { isSignedIn } = useTimeoAuth();
  const registerPushToken = useMutation(api.notifications.registerPushToken);
  const handleRegister = useCallback(
    async (token: string, platform: "ios" | "android") => {
      try {
        await registerPushToken({ token, platform });
      } catch {
        // Silently fail — token will be registered on next app open
      }
    },
    [registerPushToken]
  );
  usePushNotifications(isSignedIn ? handleRegister : undefined);
  return null;
}

export default function RootLayout() {
  if (!clerkKey || !convexUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a", padding: 24 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
          Configuration Error
        </Text>
        <Text style={{ color: "#999", fontSize: 14, textAlign: "center" }}>
          {!clerkKey && "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.\n"}
          {!convexUrl && "EXPO_PUBLIC_CONVEX_URL is missing.\n"}
          Check your .env file and restart the dev server.
        </Text>
      </View>
    );
  }

  return (
    <TimeoAnalyticsProvider
      apiKey={Constants.expoConfig?.extra?.posthogKey ?? ""}
      host={Constants.expoConfig?.extra?.posthogHost}
    >
      <TimeoAuthProvider
        publishableKey={clerkKey}
        convexUrl={convexUrl}
      >
        <ThemeProvider>
          <CartProvider>
            <PushRegistration />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="services/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="products/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="bookings/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen name="cart" options={{ presentation: "card" }} />
              <Stack.Screen
                name="notifications/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="memberships/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="qr-code/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="sessions/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="sessions/[id]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="vouchers/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="packages/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="gift-cards/index"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="receipts/index"
                options={{ presentation: "card" }}
              />
            </Stack>
          </CartProvider>
        </ThemeProvider>
      </TimeoAuthProvider>
    </TimeoAnalyticsProvider>
  );
}
