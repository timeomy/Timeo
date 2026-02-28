"use client";

/**
 * No-op in the new stack.
 * Better Auth automatically syncs user records at sign-up/sign-in.
 * Kept for backwards compatibility with portal layout.
 */
export function useEnsureUser(_isSignedIn: boolean) {
  // no-op — user sync is handled by Better Auth server-side
}
