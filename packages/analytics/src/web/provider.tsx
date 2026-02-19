"use client";

/**
 * PostHogProvider for Next.js (web app).
 *
 * Uses posthog-js and wraps it in a React context for client-side usage.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import posthog, { type PostHog } from "posthog-js";

const PostHogContext = createContext<PostHog | null>(null);

export interface TimeoWebAnalyticsProviderProps {
  apiKey: string;
  host?: string;
  children: ReactNode;
}

export function TimeoWebAnalyticsProvider({
  apiKey,
  host = "https://us.i.posthog.com",
  children,
}: TimeoWebAnalyticsProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!apiKey || initialized.current) return;

    posthog.init(apiKey, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });

    initialized.current = true;
  }, [apiKey, host]);

  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <PostHogContext.Provider value={posthog}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHogWeb(): PostHog | null {
  return useContext(PostHogContext);
}
