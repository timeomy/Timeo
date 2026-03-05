import "../global.css";
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider, useTimeoAuth } from "@timeo/auth";
import { ThemeProvider, LoadingScreen, usePushNotifications } from "@timeo/ui";
import { TimeoAnalyticsProvider } from "@timeo/analytics";
import Constants from "expo-constants";
import { CartProvider } from "../providers/cart";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
});

function PushRegistration() {
  const { isSignedIn } = useTimeoAuth();
  const handleRegister = useCallback(
    async (_token: string, _platform: "ios" | "android") => {
      // Push token registration is handled server-side via Better Auth session
    },
    []
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
  return (
    <QueryClientProvider client={queryClient}>
      <TimeoAnalyticsProvider
        apiKey={Constants.expoConfig?.extra?.posthogKey ?? ""}
        host={Constants.expoConfig?.extra?.posthogHost}
      >
        <TimeoAuthProvider>
          <ThemeProvider dark>
            <CartProvider>
              <NavigationContent />
            </CartProvider>
          </ThemeProvider>
        </TimeoAuthProvider>
      </TimeoAnalyticsProvider>
    </QueryClientProvider>
  );
}
