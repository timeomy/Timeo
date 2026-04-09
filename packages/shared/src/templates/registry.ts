export const TEMPLATE_INDUSTRIES = [
  "fitness",
  "salon",
  "mssp",
  "retail",
  "restaurant",
  "wellness",
  "coaching",
  "physio",
  "clinic",
] as const;

export type TemplateIndustry = (typeof TEMPLATE_INDUSTRIES)[number];

export const MEMBER_BLOCK_REGISTRY = {
  member_summary: "Member Summary",
  upcoming_bookings: "Upcoming Bookings",
  membership_status: "Membership Status",
  class_schedule: "Class Schedule",
  service_catalog: "Service Catalog",
  invoice_history: "Invoice History",
  loyalty_balance: "Loyalty Balance",
} as const;

export type MemberBlockType = keyof typeof MEMBER_BLOCK_REGISTRY;

export const ADMIN_WIDGET_REGISTRY = {
  kpi_overview: "KPI Overview",
  today_schedule: "Today Schedule",
  pending_payments: "Pending Payments",
  new_members: "New Members",
  inventory_alerts: "Inventory Alerts",
  staff_utilization: "Staff Utilization",
  compliance_tasks: "Compliance Tasks",
} as const;

export type AdminWidgetType = keyof typeof ADMIN_WIDGET_REGISTRY;

export const ALLOWED_MEMBER_BLOCK_TYPES = Object.keys(
  MEMBER_BLOCK_REGISTRY,
) as MemberBlockType[];

export const ALLOWED_ADMIN_WIDGET_TYPES = Object.keys(
  ADMIN_WIDGET_REGISTRY,
) as AdminWidgetType[];

const memberBlockSet = new Set<string>(ALLOWED_MEMBER_BLOCK_TYPES);
const adminWidgetSet = new Set<string>(ALLOWED_ADMIN_WIDGET_TYPES);

export function isTemplateIndustry(value: string): value is TemplateIndustry {
  return (TEMPLATE_INDUSTRIES as readonly string[]).includes(value);
}

export function isAllowedMemberBlockType(
  value: string,
): value is MemberBlockType {
  return memberBlockSet.has(value);
}

export function isAllowedAdminWidgetType(
  value: string,
): value is AdminWidgetType {
  return adminWidgetSet.has(value);
}
