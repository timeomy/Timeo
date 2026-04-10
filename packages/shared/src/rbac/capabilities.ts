export const RBAC_ROLES = [
  "customer",
  "coach",
  "staff",
  "admin",
  "platform_admin",
] as const;

export type Role = (typeof RBAC_ROLES)[number];

export const RBAC_CAPABILITIES = [
  "pos_access",
  "edit_customer",
  "manual_gate_override",
  "billing_transactional",
  "billing_strategic",
  "view_analytics",
  "manage_staff",
  "manage_tenant",
  "coach_session_log",
  "coach_view_clients",
  "view_own_profile",
  "view_own_subscription",
] as const;

export type Capability = (typeof RBAC_CAPABILITIES)[number];

const ROLE_ALIASES = {
  member: "customer",
  front_desk: "staff",
  owner: "admin",
} as const satisfies Record<string, Role>;

export type RoleAlias = keyof typeof ROLE_ALIASES;

export const CAPABILITY_MATRIX = {
  customer: ["view_own_profile", "view_own_subscription"],
  coach: [
    "coach_session_log",
    "coach_view_clients",
    "view_own_profile",
    "view_own_subscription",
  ],
  staff: [
    "pos_access",
    "edit_customer",
    "manual_gate_override",
    "billing_transactional",
    "coach_session_log",
    "coach_view_clients",
    "view_own_profile",
    "view_own_subscription",
  ],
  admin: [
    "pos_access",
    "edit_customer",
    "manual_gate_override",
    "billing_transactional",
    "billing_strategic",
    "view_analytics",
    "manage_staff",
    "coach_session_log",
    "coach_view_clients",
    "view_own_profile",
    "view_own_subscription",
  ],
  platform_admin: [...RBAC_CAPABILITIES],
} as const satisfies Record<Role, readonly Capability[]>;

const capabilitySet = new Set<Capability>(RBAC_CAPABILITIES);

const capabilitySetByRole: Record<Role, ReadonlySet<Capability>> = {
  customer: new Set(CAPABILITY_MATRIX.customer),
  coach: new Set(CAPABILITY_MATRIX.coach),
  staff: new Set(CAPABILITY_MATRIX.staff),
  admin: new Set(CAPABILITY_MATRIX.admin),
  platform_admin: new Set(CAPABILITY_MATRIX.platform_admin),
};

export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return "customer";

  const normalized = role.toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized in ROLE_ALIASES) {
    return ROLE_ALIASES[normalized as RoleAlias];
  }

  if (normalized === "platform_admin") return "platform_admin";
  if (normalized === "admin") return "admin";
  if (normalized === "staff") return "staff";
  if (normalized === "coach") return "coach";
  return "customer";
}

export function getCapabilitiesForRole(role: string): Capability[] {
  const resolvedRole = normalizeRole(role);
  return [...CAPABILITY_MATRIX[resolvedRole]];
}

export function hasCapability(role: string, capability: string): boolean {
  if (!capabilitySet.has(capability as Capability)) return false;

  const resolvedRole = normalizeRole(role);
  if (resolvedRole === "platform_admin") return true;

  return capabilitySetByRole[resolvedRole].has(capability as Capability);
}
