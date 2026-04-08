import { getPreferredTenant } from "./tenant-selection";
import type { TenantInfo, TimeoRole, ViewMode } from "./types";

export type PlatformRole = "platform_admin" | "user";

type RoutingTenant = {
  id: string;
  role: string;
  slug?: string | null;
};

const ROLE_POWER: Record<TimeoRole, number> = {
  customer: 1,
  coach: 2,
  staff: 2,
  admin: 3,
  platform_admin: 4,
};

export function normalizeTimeoRole(role: string | null | undefined): TimeoRole {
  if (!role) return "customer";

  const normalized = role.toLowerCase();
  if (normalized === "member") return "customer";
  if (normalized === "owner") return "admin";
  if (normalized === "platform_admin") return "platform_admin";
  if (normalized === "admin") return "admin";
  if (normalized === "staff") return "staff";
  if (normalized === "coach") return "coach";
  return "customer";
}

export function canAssumeRole(baseRole: TimeoRole, targetRole: TimeoRole): boolean {
  if (baseRole === "platform_admin") return true;
  if (targetRole === "platform_admin") return false;
  return ROLE_POWER[baseRole] >= ROLE_POWER[targetRole];
}

export function getRoleHomePath(role: TimeoRole): string {
  if (role === "platform_admin") return "/admin";
  if (role === "admin") return "/dashboard/gym";
  if (role === "staff" || role === "coach") return "/dashboard/gym/checkins";
  return "/portal";
}

export function getPreferredRoutingTenant<T extends RoutingTenant>(
  tenants: T[],
  candidateTenantId?: string | null,
): T | null {
  if (tenants.length === 0) return null;

  const normalizedTenants: TenantInfo[] = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.id,
    slug: tenant.slug ?? null,
    role: normalizeTimeoRole(tenant.role),
  }));

  const preferred = getPreferredTenant(normalizedTenants, candidateTenantId);
  if (!preferred) return null;

  return tenants.find((tenant) => tenant.id === preferred.id) ?? null;
}

interface ResolveEffectiveRoleOptions {
  platformRole: PlatformRole;
  membershipRole: TimeoRole;
  viewMode?: ViewMode;
  viewAsRole?: string | null;
}

export function resolveEffectiveRole({
  platformRole,
  membershipRole,
  viewMode,
  viewAsRole,
}: ResolveEffectiveRoleOptions): TimeoRole {
  const requestedRole = normalizeTimeoRole(viewAsRole);

  if (platformRole === "platform_admin" && viewMode !== "tenant") {
    return "platform_admin";
  }

  if (!viewAsRole) return membershipRole;
  if (!canAssumeRole(membershipRole, requestedRole) && platformRole !== "platform_admin") {
    return membershipRole;
  }

  if (platformRole === "platform_admin" && requestedRole === "platform_admin") {
    return membershipRole;
  }

  return requestedRole;
}

interface ResolveHomePathOptions<T extends RoutingTenant> {
  platformRole: PlatformRole;
  tenants: T[];
  viewMode?: ViewMode;
  activeTenantId?: string | null;
  viewAsRole?: string | null;
}

export function resolveHomePath<T extends RoutingTenant>({
  platformRole,
  tenants,
  viewMode,
  activeTenantId,
  viewAsRole,
}: ResolveHomePathOptions<T>): string {
  if (platformRole === "platform_admin" && viewMode !== "tenant") {
    return "/admin";
  }

  const preferredTenant = getPreferredRoutingTenant(tenants, activeTenantId);
  if (!preferredTenant) return "/portal";

  const membershipRole = normalizeTimeoRole(preferredTenant.role);
  const effectiveRole = resolveEffectiveRole({
    platformRole,
    membershipRole,
    viewMode,
    viewAsRole,
  });

  return getRoleHomePath(effectiveRole);
}

interface ResolvePostLoginPathOptions<T extends RoutingTenant> {
  platformRole: PlatformRole;
  tenants: T[];
}

export function resolvePostLoginPath<T extends RoutingTenant>({
  platformRole,
  tenants,
}: ResolvePostLoginPathOptions<T>): string {
  if (platformRole === "platform_admin") {
    return "/admin";
  }

  const preferredTenant = getPreferredRoutingTenant(tenants);
  if (!preferredTenant) return "/portal";

  return getRoleHomePath(normalizeTimeoRole(preferredTenant.role));
}

export function hasStaffLikeMembership(tenants: RoutingTenant[]): boolean {
  return tenants.some((tenant) => {
    const role = normalizeTimeoRole(tenant.role);
    return role === "admin" || role === "staff" || role === "coach";
  });
}

export function hasAdminLikeMembership(tenants: RoutingTenant[]): boolean {
  return tenants.some((tenant) => {
    const role = normalizeTimeoRole(tenant.role);
    return role === "admin";
  });
}
