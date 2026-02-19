// Web (Next.js) client-safe auth exports
export { TimeoWebAuthProvider, useTimeoWebAuthContext, useTimeoWebTenantContext } from "./provider";

// Re-export shared types and utils for convenience
export type { TimeoAuthContext, TenantSwitcherContext, TimeoRole, TenantInfo, RoleContext } from "../types";
export { ROLES, clerkRoleToTimeo, isRoleAtLeast } from "../types";
export { hasPermission, PERMISSIONS } from "../permissions";
export type { Resource } from "../permissions";
export { getAuthInfo, requireAuthInfo, requireTenantAuthInfo } from "../convex";
export type { ConvexAuthInfo } from "../convex";
