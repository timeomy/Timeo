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
        </Stack>
      </ThemeProvider>
    </TimeoAuthProvider>
  );
}
