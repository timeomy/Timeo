import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider } from "@timeo/auth";
import { ThemeProvider } from "@timeo/ui";
import Constants from "expo-constants";
import { CartProvider } from "./providers/cart";

export default function RootLayout() {
  return (
    <TimeoAuthProvider
      publishableKey={Constants.expoConfig?.extra?.clerkPublishableKey ?? ""}
      convexUrl={Constants.expoConfig?.extra?.convexUrl ?? ""}
    >
      <ThemeProvider>
        <CartProvider>
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
          </Stack>
        </CartProvider>
      </ThemeProvider>
    </TimeoAuthProvider>
  );
}
