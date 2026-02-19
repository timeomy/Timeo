import type { TimeoRole } from "./types";
import { clerkRoleToTimeo } from "./types";

/**
 * Auth info extracted from Convex mutation/query context.
 *
 * Usage in a Convex function:
 *   const auth = await getAuthInfo(ctx);
 *   if (!auth) throw new Error("Not authenticated");
 */
export interface ConvexAuthInfo {
  /** Clerk user ID (sub claim) */
  userId: string;
  /** Active tenant/org ID (org_id claim) — null if no org selected */
  tenantId: string | null;
  /** Mapped Timeo role for the active org */
  role: TimeoRole;
}

/**
 * Reads the Clerk JWT custom claims from ctx.auth and returns
 * typed auth info. Returns null if not authenticated.
 *
 * Expects the Clerk JWT template "convex" to include:
 *   { sub, org_id, org_role, org_slug }
 */
export async function getAuthInfo(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; [k: string]: unknown } | null> };
}): Promise<ConvexAuthInfo | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const userId = identity.subject;
  const tenantId = (identity as Record<string, unknown>).org_id as string | undefined ?? null;
  const orgRole = (identity as Record<string, unknown>).org_role as string | undefined;
  const role = clerkRoleToTimeo(orgRole);

  return { userId, tenantId, role };
}

/**
 * Like getAuthInfo but throws if the user is not authenticated.
 */
export async function requireAuthInfo(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; [k: string]: unknown } | null> };
}): Promise<ConvexAuthInfo> {
  const info = await getAuthInfo(ctx);
  if (!info) throw new Error("Authentication required");
  return info;
}

/**
 * Like requireAuthInfo but also ensures a tenant is selected.
 */
export async function requireTenantAuthInfo(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; [k: string]: unknown } | null> };
}): Promise<ConvexAuthInfo & { tenantId: string }> {
  const info = await requireAuthInfo(ctx);
  if (!info.tenantId) throw new Error("No active tenant selected");
  return info as ConvexAuthInfo & { tenantId: string };
}
