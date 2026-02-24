import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Timeo Staff",
  slug: "timeo-staff",
  owner: "oxloz",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "timeo-staff",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B0B0F",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "my.timeo.staff",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0B0F",
    },
    package: "my.timeo.staff",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow Timeo Staff to use the camera for QR code scanning.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    convexSiteUrl: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    eas: {
      projectId: "e9cf9a45-b275-48ae-96d6-9ba4313f5d48",
    },
  },
});
