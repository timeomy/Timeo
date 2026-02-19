"use client";

import { ReactNode } from "react";
import { TimeoWebAuthProvider } from "@timeo/auth/web";
import { TimeoWebAnalyticsProvider } from "@timeo/analytics/web";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TimeoWebAnalyticsProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""}
      host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
    >
      <TimeoWebAuthProvider
        convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL as string}
      >
        {children}
      </TimeoWebAuthProvider>
    </TimeoWebAnalyticsProvider>
  );
}
