/**
 * @deprecated This file is Convex-specific and will be deleted after the Convex → PostgreSQL migration.
 * Auth is now handled by the Hono API server at packages/api/src/middleware/auth.ts.
 */
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

let _cached: ReturnType<typeof convexBetterAuthNextJs> | null = null;

function getAuth() {
  if (!_cached) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;
    _cached = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
  }
  return _cached;
}

export const handler = {
  GET: (req: Request) => getAuth().handler.GET(req),
  POST: (req: Request) => getAuth().handler.POST(req),
};

export const isAuthenticated = (...args: Parameters<ReturnType<typeof convexBetterAuthNextJs>["isAuthenticated"]>) =>
  getAuth().isAuthenticated(...args);

export const getToken = (...args: Parameters<ReturnType<typeof convexBetterAuthNextJs>["getToken"]>) =>
  getAuth().getToken(...args);
