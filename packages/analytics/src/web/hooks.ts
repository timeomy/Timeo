"use client";

/**
 * Analytics hooks for Next.js (web).
 *
 * Uses the web PostHog instance from the provider context.
 */
import { useCallback } from "react";
import { usePostHogWeb } from "./provider";
import type { TimeoEvent, TimeoEventMap } from "../events";

export { usePostHogWeb } from "./provider";

/**
 * Returns a type-safe tracking function for Timeo events (web).
 */
export function useTrackEventWeb() {
  const posthog = usePostHogWeb();

  return useCallback(
    <E extends TimeoEvent>(event: E, properties: TimeoEventMap[E]) => {
      posthog?.capture(event, properties as unknown as Record<string, unknown>);
    },
    [posthog]
  );
}

/**
 * Convenience hook to check a PostHog feature flag value (web).
 */
export function useFeatureFlagWeb(
  flagKey: string
): boolean | string | undefined {
  const posthog = usePostHogWeb();
  return posthog?.getFeatureFlag(flagKey) ?? undefined;
}
