/**
 * Analytics hooks for React Native (mobile).
 *
 * Re-exports posthog-react-native hooks and adds a typed `useTrackEvent`.
 */
import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";
import type { TimeoEvent, TimeoEventMap } from "./events";

export { usePostHog } from "posthog-react-native";

/**
 * Returns a type-safe tracking function for Timeo events.
 *
 * Usage:
 *   const track = useTrackEvent();
 *   track("service_viewed", { service_id: "123", ... });
 */
export function useTrackEvent() {
  const posthog = usePostHog();

  return useCallback(
    <E extends TimeoEvent>(event: E, properties: TimeoEventMap[E]) => {
      posthog.capture(event, properties as any);
    },
    [posthog]
  );
}

/**
 * Convenience hook to check a PostHog feature flag value.
 */
export function useFeatureFlag(flagKey: string): boolean | string | undefined {
  const posthog = usePostHog();
  return posthog.getFeatureFlag(flagKey) ?? undefined;
}
