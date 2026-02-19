/**
 * PostHog user identification helpers.
 *
 * Links Clerk userId to PostHog distinct_id so that events from
 * anonymous sessions can be merged with authenticated users.
 */
import type PostHog from "posthog-react-native";
import type { PostHog as PostHogWeb } from "posthog-js";

export interface IdentifyUserProps {
  clerkUserId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Identify a user (mobile – posthog-react-native).
 */
export function identifyUser(
  posthog: PostHog | null | undefined,
  props: IdentifyUserProps
) {
  if (!posthog) return;

  posthog.identify(props.clerkUserId, {
    email: props.email,
    name: props.name,
    avatar_url: props.avatarUrl,
  });
}

/**
 * Identify a user (web – posthog-js).
 */
export function identifyUserWeb(
  posthog: PostHogWeb | null | undefined,
  props: IdentifyUserProps
) {
  if (!posthog) return;

  posthog.identify(props.clerkUserId, {
    email: props.email,
    name: props.name,
    avatar_url: props.avatarUrl,
  });
}

/**
 * Reset user identity (on sign-out).
 */
export function resetUser(posthog: PostHog | PostHogWeb | null | undefined) {
  if (!posthog) return;
  posthog.reset();
}
