import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/**
 * Mobile (Expo) auth client.
 * Uses expo-secure-store for token persistence.
 * Connects to the Hono API server at EXPO_PUBLIC_API_URL.
 */
export const authClient = createAuthClient({
  baseURL:
    (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/auth",
  plugins: [
    expoClient({
      scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "timeo",
      storagePrefix: "timeo",
      storage: SecureStore,
    }),
  ],
});
