import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Timeo Admin",
  slug: "timeo-admin",
  owner: "oxloz",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "timeo-admin",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1A56DB",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "my.timeo.admin",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A56DB",
    },
    package: "my.timeo.admin",
  },
  newArchEnabled: true,
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    eas: {
      projectId: "b05aca04-f736-4a1a-9c76-4f5ea0fcdc58",
    },
  },
});
