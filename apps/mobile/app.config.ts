import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Timeo",
  slug: "timeo",
  owner: "oxloz",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "timeo",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: "com.oxloz.timeo",
    buildNumber: process.env.EXPO_IOS_BUILD_NUMBER ?? "1",
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        "Timeo needs camera access to scan member QR codes for check-ins.",
      NSUserNotificationsUsageDescription:
        "Timeo sends reminders for bookings, class updates, and important account alerts.",
    },
  },
  android: {
    package: "com.oxloz.timeo",
    versionCode: Number.parseInt(
      process.env.EXPO_ANDROID_VERSION_CODE ?? "1",
      10,
    ),
    permissions: ["CAMERA", "VIBRATE", "POST_NOTIFICATIONS"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "Timeo needs camera access to scan QR codes and enroll your face for check-in.",
      },
    ],
    [
      "expo-font",
      {
        fonts: [],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    store: {
      privacyPolicyUrl: "https://timeo.my/privacy",
      category: "health-fitness",
    },
    eas: {
      projectId: "db721660-6452-498b-b554-6ce4fc2930d9",
    },
  },
});
