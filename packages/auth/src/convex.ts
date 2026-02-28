/**
 * @deprecated This file is Convex-specific and will be deleted after the Convex → PostgreSQL migration.
 * Use packages/auth/src/server.ts instead.
 */
import type { TimeoRole } from "./types";

/**
 * Auth info extracted from Convex mutation/query context.
 */
export interface ConvexAuthInfo {
  /** Better Auth user ID (subject claim) */
  userId: string;
  /** Active tenant ID — null if no tenant selected */
  tenantId: string | null;
  /** Mapped Timeo role for the active tenant */
  role: TimeoRole;
}

/**
 * Reads the Better Auth JWT claims from ctx.auth and returns
 * typed auth info. Returns null if not authenticated.
 */
export async function getAuthInfo(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; [k: string]: unknown } | null> };
}): Promise<ConvexAuthInfo | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const userId = identity.subject;

  return { userId, tenantId: null, role: "customer" };
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
