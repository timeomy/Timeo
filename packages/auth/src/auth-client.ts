import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/**
 * Mobile (Expo) auth client.
 * Uses expo-secure-store for token persistence and convexClient for JWT integration.
 */
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "timeo",
      storagePrefix: "timeo",
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
