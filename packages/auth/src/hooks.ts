import { useTimeoAuthContext, useTenantSwitcherContext } from "./provider";
import type { TimeoAuthContext, TenantSwitcherContext, RoleContext, TimeoRole } from "./types";
import { isRoleAtLeast } from "./types";
import { hasPermission, type Resource } from "./permissions";

// ─── useTimeoAuth ───────────────────────────────────────────────────
/**
 * Core auth hook. Returns user, auth state, active org/tenant, and role.
 */
export function useTimeoAuth(): TimeoAuthContext {
  return useTimeoAuthContext();
}

// ─── useRequireAuth ─────────────────────────────────────────────────
/**
 * Returns auth context. Calls `onUnauthenticated` when the user is not
 * signed in. In mobile apps this is typically a navigation redirect.
 */
export function useRequireAuth(onUnauthenticated?: () => void): TimeoAuthContext {
  const auth = useTimeoAuthContext();

  if (auth.isLoaded && !auth.isSignedIn) {
    onUnauthenticated?.();
  }

  return auth;
}

// ─── useTenantSwitcher ──────────────────────────────────────────────
/**
 * Multi-org management: list tenants, switch active org.
 */
export function useTenantSwitcher(): TenantSwitcherContext {
  return useTenantSwitcherContext();
}

// ─── useRole ────────────────────────────────────────────────────────
/**
 * Current user's role with convenience booleans.
 */
export function useRole(): RoleContext {
  const { activeRole } = useTimeoAuthContext();

  return {
    role: activeRole,
    isCustomer: activeRole === "customer",
    isStaff: isRoleAtLeast(activeRole, "staff"),
    isAdmin: isRoleAtLeast(activeRole, "admin"),
    isPlatformAdmin: activeRole === "platform_admin",
  };
}

// ─── usePermission ──────────────────────────────────────────────────
/**
 * Check if the current user has a specific permission.
 */
export function usePermission(resource: Resource, action: string): boolean {
  const { role } = useRole();
  return hasPermission(role, resource, action);
}
