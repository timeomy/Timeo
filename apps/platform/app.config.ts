import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Timeo Platform",
  slug: "timeo-platform",
  owner: "oxloz",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "timeo-platform",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1A56DB",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "my.timeo.platform",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A56DB",
    },
    package: "my.timeo.platform",
  },
  newArchEnabled: true,
  plugins: ["expo-router", "expo-secure-store", "expo-dev-client"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    convexSiteUrl: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    eas: {
      projectId: "9ae7470a-9afd-4b81-9640-bf67ad8e241a",
    },
  },
});
