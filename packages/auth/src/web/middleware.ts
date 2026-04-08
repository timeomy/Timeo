import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPreferredRoutingTenant,
  resolveEffectiveRole,
  resolveHomePath,
  resolvePostLoginPath,
  normalizeTimeoRole,
} from "../routing";

type PlatformRole = "platform_admin" | "user";

type TenantSummary = {
  id: string;
  role: string;
  slug?: string | null;
};

type MinePayload = {
  tenants: TenantSummary[];
  platformRole: PlatformRole;
};

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

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
  /^\/change-password/,
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

function getSessionToken(req: NextRequest): string | null {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const token = req.cookies.get(cookieName)?.value;
    if (token) return token;
  }
  return null;
}

function toViewMode(raw: string | undefined): "platform" | "tenant" | undefined {
  if (raw === "platform" || raw === "tenant") return raw;
  return undefined;
}

function redirectTo(req: NextRequest, path: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

function isSamePath(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

async function getMinePayload(req: NextRequest): Promise<MinePayload | null> {
  try {
    const response = await fetch(new URL("/api/tenants/mine", req.url), {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as
      | { success: true; data: MinePayload }
      | { success: false; error: { code: string; message: string } };

    if (!payload || payload.success !== true) return null;
    return payload.data;
  } catch {
    return null;
  }
}

/**
 * Better Auth middleware for Next.js.
 * Checks for session token cookie and redirects unauthenticated users.
 */
export async function timeoMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public routes are always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = getSessionToken(req);

  // Protected routes require a session
  if (isProtectedRoute(pathname) && !sessionToken) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const needsRoleRouting =
    pathname === "/post-login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/portal");

  if (!needsRoleRouting || !sessionToken) {
    return NextResponse.next();
  }

  const mine = await getMinePayload(req);
  if (!mine) {
    return NextResponse.next();
  }

  const viewMode = toViewMode(req.cookies.get("timeo.viewMode")?.value);
  const viewAsRole = req.cookies.get("timeo.viewAsRole")?.value;
  const activeTenantId = req.cookies.get("timeo.activeTenantId")?.value;

  const homePath = resolveHomePath({
    platformRole: mine.platformRole,
    tenants: mine.tenants,
    viewMode,
    activeTenantId,
    viewAsRole,
  });

  const preferredTenant = getPreferredRoutingTenant(mine.tenants, activeTenantId);
  const membershipRole = normalizeTimeoRole(preferredTenant?.role);
  const activeRole = resolveEffectiveRole({
    platformRole: mine.platformRole,
    membershipRole,
    viewMode,
    viewAsRole,
  });

  if (pathname === "/post-login") {
    const postLoginPath = resolvePostLoginPath({
      platformRole: mine.platformRole,
      tenants: mine.tenants,
    });

    if (!isSamePath(pathname, postLoginPath)) {
      return redirectTo(req, postLoginPath);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && mine.platformRole !== "platform_admin") {
    return redirectTo(req, homePath);
  }

  if (pathname.startsWith("/dashboard") && activeRole === "customer") {
    return redirectTo(req, homePath);
  }

  if (pathname.startsWith("/portal") && activeRole !== "customer") {
    return redirectTo(req, homePath);
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
