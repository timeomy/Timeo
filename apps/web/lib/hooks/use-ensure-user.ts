"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";

/**
 * Ensures the authenticated user has a corresponding Convex user record.
 * Calls `auth.ensureUser` once per mount so downstream queries never
 * hit "User not found".
 */
export function useEnsureUser(isSignedIn: boolean) {
  const ensureUser = useMutation(api.auth.ensureUser);
  const hasRun = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasRun.current) {
      hasRun.current = true;
      ensureUser().catch((err) => {
        // Non-fatal — user may already exist
        console.warn("[useEnsureUser]", err);
        hasRun.current = false; // allow retry on next render
      });
    }
  }, [isSignedIn, ensureUser]);
}
