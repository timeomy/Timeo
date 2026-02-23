// ─── Mobile (Expo) Auth Exports ─────────────────────────────────────

// Provider
export { TimeoAuthProvider } from "./provider";

// Auth client
export { authClient } from "./auth-client";

// Hooks
export { useTimeoAuth, useRequireAuth, useTenantSwitcher, useRole, usePermission } from "./hooks";

// Guards
export { AuthGuard, TenantGuard, RoleGuard } from "./guards";

// Screens
export { SignInScreen } from "./screens/SignInScreen";
export { SignUpScreen } from "./screens/SignUpScreen";
export { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
export { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
export { VerifyEmailScreen } from "./screens/VerifyEmailScreen";
export { TenantSelectScreen } from "./screens/TenantSelectScreen";

// Types
export type {
  TimeoRole,
  TimeoUser,
  TimeoAuthContext,
  TenantInfo,
  TenantSwitcherContext,
  RoleContext,
} from "./types";
export { ROLES, isRoleAtLeast } from "./types";

// Permissions
export { hasPermission, PERMISSIONS } from "./permissions";
export type { Resource } from "./permissions";

// Convex auth helper
export { getAuthInfo, requireAuthInfo, requireTenantAuthInfo } from "./convex";
export type { ConvexAuthInfo } from "./convex";
