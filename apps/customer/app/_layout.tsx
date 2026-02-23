import "../global.css";
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider, useTimeoAuth } from "@timeo/auth";
import { ThemeProvider, LoadingScreen, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { CartProvider } from "../providers/cart";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useCallback, useEffect, useRef } from "react";
import { View, Text } from "react-native";

const convexUrl = Constants.expoConfig?.extra?.convexUrl ?? "";

function EnsureUser() {
  const { isSignedIn } = useTimeoAuth();
  const ensureUser = useMutation(api.auth.ensureUser);
  const hasEnsured = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasEnsured.current) {
      hasEnsured.current = true;
      ensureUser({}).catch(() => {});
    }
    if (!isSignedIn) {
      hasEnsured.current = false;
    }
  }, [isSignedIn, ensureUser]);

  return null;
}

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

function useProtectedRoute() {
  const { isLoaded, isSignedIn } = useTimeoAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, segments]);
}

function NavigationContent() {
  useProtectedRoute();
  const { isLoaded } = useTimeoAuth();

  if (!isLoaded) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <>
      <EnsureUser />
      <PushRegistration />
      <StatusBar style="light" />
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
        <Stack.Screen name="join" options={{ presentation: "card" }} />
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
    </>
  );
}

export default function RootLayout() {
  if (!convexUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0F", padding: 24 }}>
        <Text style={{ color: "#EDECE8", fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
          Configuration Error
        </Text>
        <Text style={{ color: "#88878F", fontSize: 14, textAlign: "center" }}>
          EXPO_PUBLIC_CONVEX_URL is missing.{"\n"}
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
        convexUrl={convexUrl}
      >
        <ThemeProvider dark>
          <CartProvider>
            <NavigationContent />
          </CartProvider>
        </ThemeProvider>
      </TimeoAuthProvider>
    </TimeoAnalyticsProvider>
  );
}
