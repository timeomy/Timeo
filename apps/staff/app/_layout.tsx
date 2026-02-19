import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TimeoAuthProvider } from "@timeo/auth";
import { ThemeProvider } from "@timeo/ui";
import Constants from "expo-constants";

export default function RootLayout() {
  return (
    <TimeoAuthProvider
      publishableKey={Constants.expoConfig?.extra?.clerkPublishableKey ?? ""}
      convexUrl={Constants.expoConfig?.extra?.convexUrl ?? ""}
    >
      <ThemeProvider>
        <StatusBar style="auto" />
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
        </Stack>
      </ThemeProvider>
    </TimeoAuthProvider>
  );
}
