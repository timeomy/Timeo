/**
 * PostHogProvider for React Native (Expo mobile apps).
 *
 * Wraps posthog-react-native's provider with Timeo-specific defaults.
 */
import React, { type ReactNode } from "react";
import { PostHogProvider as RNPostHogProvider } from "posthog-react-native";

export interface TimeoAnalyticsProviderProps {
  apiKey: string;
  host?: string;
  children: ReactNode;
}

export function TimeoAnalyticsProvider({
  apiKey,
  host = "https://us.i.posthog.com",
  children,
}: TimeoAnalyticsProviderProps) {
  if (!apiKey) {
    // Gracefully degrade — don't crash the app if no key is set
    return <>{children}</>;
  }

  return (
    <RNPostHogProvider
      apiKey={apiKey}
      options={{
        host,
        enableSessionReplay: false,
      }}
      autocapture={{
        captureLifecycleEvents: true,
        captureScreens: true,
        captureTouches: false,
      }}
    >
      {children}
    </RNPostHogProvider>
  );
}
