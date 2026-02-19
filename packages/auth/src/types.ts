/** Timeo role hierarchy — lower index = more power */
export const ROLES = ["platform_admin", "admin", "staff", "customer"] as const;

export type TimeoRole = (typeof ROLES)[number];

/** Clerk org role strings map to Timeo roles */
export const CLERK_ROLE_MAP: Record<string, TimeoRole> = {
  "org:platform_admin": "platform_admin",
  "org:admin": "admin",
  "org:staff": "staff",
  "org:customer": "customer",
  // Clerk default member role → customer
  "org:member": "customer",
};

export function clerkRoleToTimeo(clerkRole: string | undefined): TimeoRole {
  if (!clerkRole) return "customer";
  return CLERK_ROLE_MAP[clerkRole] ?? "customer";
}

/** Returns true if `role` is at least as powerful as `minimumRole` */
export function isRoleAtLeast(role: TimeoRole, minimumRole: TimeoRole): boolean {
  return ROLES.indexOf(role) <= ROLES.indexOf(minimumRole);
}

export interface TimeoUser {
  id: string;
  email: string | undefined;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  imageUrl: string | undefined;
}

export interface TimeoAuthContext {
  user: TimeoUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  activeOrg: { id: string; name: string; slug: string | null } | null;
  activeTenantId: string | null;
  activeRole: TimeoRole;
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
  switchTenant: (orgId: string) => Promise<void>;
  isLoading: boolean;
}

export interface RoleContext {
  role: TimeoRole;
  isCustomer: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}
