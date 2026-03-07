/** Timeo role hierarchy — lower index = more power */
export const ROLES = ["platform_admin", "admin", "staff", "customer"] as const;

export type TimeoRole = (typeof ROLES)[number];

/** Returns true if `role` is at least as powerful as `minimumRole` */
export function isRoleAtLeast(role: TimeoRole, minimumRole: TimeoRole): boolean {
  return ROLES.indexOf(role) <= ROLES.indexOf(minimumRole);
}

export interface TimeoUser {
  id: string;
  email: string | undefined;
  name: string | undefined;
  imageUrl: string | undefined;
}

/** Whether the platform admin is viewing C2 ("platform") or a tenant dashboard ("tenant") */
export type ViewMode = "platform" | "tenant";

export interface TimeoAuthContext {
  user: TimeoUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  activeTenantId: string | null;
  activeRole: TimeoRole;
  setActiveTenant: (tenantId: string) => void;
  /** True if the user has platform_admin in users.role (independent of viewMode) */
  isPlatformAdmin: boolean;
  /** Current view mode — only meaningful for platform admins */
  viewMode: ViewMode;
  /** Switch between "platform" (C2) and "tenant" (business dashboard) views */
  setViewMode: (mode: ViewMode) => void;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string | null;
  role: TimeoRole;
}

export interface TenantSwitcherContext {
  tenants: TenantInfo[];
  activeTenant: TenantInfo | null;
  switchTenant: (tenantId: string) => void;
  isLoading: boolean;
}

export interface RoleContext {
  role: TimeoRole;
  isCustomer: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}
