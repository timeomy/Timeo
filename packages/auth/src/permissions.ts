import type { TimeoRole } from "./types";

// ─── Resource + Action Types ────────────────────────────────────────
export type Resource = keyof typeof PERMISSIONS.platform_admin;
export type Action = string;

// ─── Permission Map ─────────────────────────────────────────────────
export const PERMISSIONS = {
  customer: {
    services: ["read"],
    bookings: ["read", "create", "cancel_own"],
    products: ["read"],
    orders: ["read_own", "create"],
    staff: [] as string[],
    settings: [] as string[],
    analytics: [] as string[],
    tenants: [] as string[],
    system: [] as string[],
  },
  staff: {
    services: ["read", "create", "update"],
    bookings: ["read", "create", "update", "cancel"],
    products: ["read", "create", "update"],
    orders: ["read", "update"],
    staff: [] as string[],
    settings: [] as string[],
    analytics: [] as string[],
    tenants: [] as string[],
    system: [] as string[],
  },
  admin: {
    services: ["read", "create", "update", "delete"],
    bookings: ["read", "create", "update", "cancel", "delete"],
    products: ["read", "create", "update", "delete"],
    orders: ["read", "update", "delete", "refund"],
    staff: ["read", "invite", "update", "remove"],
    settings: ["read", "update"],
    analytics: ["read"],
    tenants: [] as string[],
    system: [] as string[],
  },
  platform_admin: {
    services: ["read", "create", "update", "delete"],
    bookings: ["read", "create", "update", "cancel", "delete"],
    products: ["read", "create", "update", "delete"],
    orders: ["read", "update", "delete", "refund"],
    staff: ["read", "invite", "update", "remove"],
    settings: ["read", "update"],
    analytics: ["read", "export"],
    tenants: ["read", "create", "update", "delete", "impersonate"],
    system: ["read", "configure", "manage_roles"],
  },
} as const satisfies Record<TimeoRole, Record<string, readonly string[]>>;

// ─── Runtime Permission Check ───────────────────────────────────────
export function hasPermission(
  role: TimeoRole,
  resource: Resource,
  action: string,
): boolean {
  if (role === "platform_admin") return true;

  const perms = PERMISSIONS[role]?.[resource] as readonly string[] | undefined;
  if (!perms) return false;

  return perms.indexOf(action) !== -1;
}
