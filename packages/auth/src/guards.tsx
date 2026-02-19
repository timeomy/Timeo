import React from "react";
import { useTimeoAuth, useRole } from "./hooks";
import type { TimeoRole } from "./types";
import { isRoleAtLeast } from "./types";

// ─── AuthGuard ──────────────────────────────────────────────────────
interface AuthGuardProps {
  children: React.ReactNode;
  /** Shown while auth is loading */
  loading?: React.ReactNode;
  /** Shown when not authenticated */
  fallback?: React.ReactNode;
}

/**
 * Requires authentication. Shows loading while auth initializes,
 * fallback if not signed in.
 */
export function AuthGuard({ children, loading = null, fallback = null }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useTimeoAuth();

  if (!isLoaded) return <>{loading}</>;
  if (!isSignedIn) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── TenantGuard ────────────────────────────────────────────────────
interface TenantGuardProps {
  children: React.ReactNode;
  /** Shown when no active tenant is selected */
  fallback?: React.ReactNode;
}

/**
 * Ensures the user has an active tenant/org selected.
 */
export function TenantGuard({ children, fallback = null }: TenantGuardProps) {
  const { activeTenantId } = useTimeoAuth();

  if (!activeTenantId) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── RoleGuard ──────────────────────────────────────────────────────
interface RoleGuardProps {
  children: React.ReactNode;
  /** Exact roles that are allowed */
  allowedRoles?: TimeoRole[];
  /** Minimum role required (uses role hierarchy) */
  minimumRole?: TimeoRole;
  /** Shown when role check fails */
  fallback?: React.ReactNode;
}

/**
 * Blocks access based on role. Supports both allowlist and minimum-role modes.
 *
 * ```tsx
 * <RoleGuard allowedRoles={["admin", "platform_admin"]}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * <RoleGuard minimumRole="staff">
 *   <StaffDashboard />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  children,
  allowedRoles,
  minimumRole,
  fallback = null,
}: RoleGuardProps) {
  const { role } = useRole();

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  if (minimumRole && !isRoleAtLeast(role, minimumRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
