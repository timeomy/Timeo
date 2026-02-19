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
        </Stack>
      </ThemeProvider>
    </TimeoAuthProvider>
  );
}
