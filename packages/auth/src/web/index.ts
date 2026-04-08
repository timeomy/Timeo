// Web (Next.js) client-safe auth exports
export { TimeoWebAuthProvider, useTimeoWebAuthContext, useTimeoWebTenantContext } from "./provider";

// Auth client
export { authClient } from "./auth-client";

// Middleware
export { timeoMiddleware, middlewareMatcher } from "./middleware";

// Re-export shared types and utils for convenience
export type { TimeoAuthContext, TenantSwitcherContext, TimeoRole, TenantInfo, RoleContext, ViewMode } from "../types";
export { ROLES, isRoleAtLeast } from "../types";
export { getHighestRoleTenant, getPreferredTenant, hasNonCustomerTenant } from "../tenant-selection";
export {
  getRoleHomePath,
  normalizeTimeoRole,
  resolveHomePath,
  resolvePostLoginPath,
  resolveEffectiveRole,
  hasStaffLikeMembership,
  hasAdminLikeMembership,
} from "../routing";
export { hasPermission, PERMISSIONS } from "../permissions";
export type { Resource } from "../permissions";
