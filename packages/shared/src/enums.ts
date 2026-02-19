export const BookingStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type BookingStatus =
  (typeof BookingStatus)[keyof typeof BookingStatus];

export const OrderStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const TenantPlan = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type TenantPlan = (typeof TenantPlan)[keyof typeof TenantPlan];

export const TenantStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  TRIAL: "trial",
} as const;

export type TenantStatus =
  (typeof TenantStatus)[keyof typeof TenantStatus];

export const MemberRole = {
  CUSTOMER: "customer",
  STAFF: "staff",
  ADMIN: "admin",
  PLATFORM_ADMIN: "platform_admin",
} as const;

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const MembershipStatus = {
  ACTIVE: "active",
  INVITED: "invited",
  SUSPENDED: "suspended",
} as const;

export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const MembershipInterval = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type MembershipInterval =
  (typeof MembershipInterval)[keyof typeof MembershipInterval];
