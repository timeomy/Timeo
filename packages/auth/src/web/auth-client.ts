"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Web (Next.js) auth client.
 * Auth requests are proxied through Next.js API routes (/api/auth/[...all]).
 * No baseURL needed — uses same-origin cookies.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
});
