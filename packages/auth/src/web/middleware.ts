import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require authentication.
 * Add patterns here as new protected routes are added.
 */
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
  "/admin(.*)",
]);

/**
 * Routes that are always public (no auth required).
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/store(.*)",
  "/api/webhooks(.*)",
]);

/**
 * Clerk middleware for Next.js.
 *
 * Usage in your app's middleware.ts:
 * ```ts
 * export { timeoMiddleware as default } from "@timeo/auth/web";
 * export const config = { matcher: middlewareMatcher };
 * ```
 */
export const timeoMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

/**
 * Next.js middleware matcher config.
 * Excludes static files and Next.js internals.
 */
export const middlewareMatcher = [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
];
