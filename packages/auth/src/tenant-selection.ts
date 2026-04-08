import type { TenantInfo, TimeoRole } from "./types";

const ROLE_PRIORITY: Record<TimeoRole, number> = {
  platform_admin: 0,
  admin: 1,
  staff: 2,
  coach: 3,
  customer: 4,
};

function getRolePriority(role: TimeoRole): number {
  return ROLE_PRIORITY[role] ?? ROLE_PRIORITY.customer;
}

export function getHighestRoleTenant(tenants: TenantInfo[]): TenantInfo | null {
  if (tenants.length === 0) return null;

  let bestTenant = tenants[0] ?? null;
  if (!bestTenant) return null;

  for (const tenant of tenants) {
    if (getRolePriority(tenant.role) < getRolePriority(bestTenant.role)) {
      bestTenant = tenant;
    }
  }

  return bestTenant;
}

export function getPreferredTenant(
  tenants: TenantInfo[],
  candidateTenantId?: string | null,
): TenantInfo | null {
  const highestRoleTenant = getHighestRoleTenant(tenants);
  if (!highestRoleTenant) return null;

  if (!candidateTenantId) return highestRoleTenant;

  const candidateTenant = tenants.find((tenant) => tenant.id === candidateTenantId);
  if (!candidateTenant) return highestRoleTenant;

  if (candidateTenant.role === "customer" && highestRoleTenant.role !== "customer") {
    return highestRoleTenant;
  }

  return candidateTenant;
}

export function hasNonCustomerTenant(tenants: TenantInfo[]): boolean {
  return tenants.some((tenant) => tenant.role !== "customer");
}
