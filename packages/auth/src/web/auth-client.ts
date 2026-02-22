"use client";

import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

/**
 * Web (Next.js) auth client.
 * Auth requests are proxied through Next.js API routes (/api/auth/[...all]).
 */
export const authClient = createAuthClient({
  plugins: [convexClient()],
});
