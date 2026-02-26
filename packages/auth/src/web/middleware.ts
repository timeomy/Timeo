import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected route patterns that require authentication.
 */
const PROTECTED_PATTERNS = [
  /^\/dashboard/,
  /^\/settings/,
  /^\/onboarding/,
  /^\/admin/,
  /^\/portal/,
  /^\/post-login/,
  /^\/join/,
];

/**
 * Public route patterns — always accessible without auth.
 */
const PUBLIC_PATTERNS = [
  /^\/$/,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/forgot-password/,
  /^\/reset-password/,
  /^\/verify-email/,
  /^\/store/,
  /^\/api\/webhooks/,
  /^\/api\/auth/,
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((p) => p.test(pathname));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATTERNS.some((p) => p.test(pathname));
}

/**
 * Better Auth middleware for Next.js.
 * Checks for session token cookie and redirects unauthenticated users.
 */
export function timeoMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes are always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected routes require a session
  if (isProtectedRoute(pathname)) {
    const sessionToken =
      req.cookies.get("better-auth.session_token")?.value ||
      req.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

/**
 * Next.js middleware matcher config.
 * Excludes static files and Next.js internals.
 */
export const middlewareMatcher = [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
];
