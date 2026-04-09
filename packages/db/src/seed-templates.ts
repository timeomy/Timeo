import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { generateId } from "./id";
import { tenantTemplates, tenantTemplateVersions } from "./schema/tenant-templates";

type MemberBlockType =
  | "member_summary"
  | "upcoming_bookings"
  | "membership_status"
  | "class_schedule"
  | "service_catalog"
  | "invoice_history"
  | "loyalty_balance";

type AdminWidgetType =
  | "kpi_overview"
  | "today_schedule"
  | "pending_payments"
  | "new_members"
  | "inventory_alerts"
  | "staff_utilization"
  | "compliance_tasks";

interface NavItemConfig {
  id: string;
  labelKey: string;
  icon: string;
  route: string;
}

interface PageConfig {
  id: string;
  titleKey: string;
  layout?: "stack" | "grid";
  blocks: MemberBlockType[];
}

interface MenuItemConfig {
  id: string;
  labelKey: string;
  icon: string;
  route: string;
}

interface AdminPageConfig {
  id: string;
  titleKey: string;
  layout?: "grid" | "stack";
  widgets: AdminWidgetType[];
}

interface TemplateSeedDefinition {
  templateKey: string;
  industry: string;
  displayName: string;
  description: string;
  featureDefaults: Record<string, boolean>;
  memberNavigation: NavItemConfig[];
  memberPages: PageConfig[];
  adminMenu: MenuItemConfig[];
  adminPages: AdminPageConfig[];
}

const baseBrandingDefaults = {
  primaryColor: null,
  secondaryColor: null,
  logoUrl: null,
  companyDisplayName: null,
};

function buildMemberNavigationItem(nav: NavItemConfig) {
  return {
    id: nav.id,
    labelKey: nav.labelKey,
    icon: nav.icon,
    route: nav.route,
    pageId: nav.id,
    visibility: { requiresFlags: [] as string[] },
  };
}

function buildMemberPage(page: PageConfig) {
  return {
    id: page.id,
    titleKey: page.titleKey,
    layout: page.layout ?? "stack",
    blocks: page.blocks.map((blockType, index) => ({
      id: `${page.id}.block.${index + 1}`,
      type: blockType,
      config: {},
      visibility: { requiresFlags: [] as string[] },
    })),
  };
}

function buildAdminMenuItem(item: MenuItemConfig) {
  return {
    id: item.id,
    labelKey: item.labelKey,
    icon: item.icon,
    route: item.route,
    pageId: item.id,
    visibility: { requiresFlags: [] as string[] },
  };
}

function buildAdminPage(page: AdminPageConfig) {
  return {
    id: page.id,
    titleKey: page.titleKey,
    layout: page.layout ?? "grid",
    widgets: page.widgets.map((widgetType, index) => ({
      id: `${page.id}.widget.${index + 1}`,
      type: widgetType,
      config: {},
      visibility: { requiresFlags: [] as string[] },
    })),
  };
}

function buildTemplateDefinition(template: TemplateSeedDefinition) {
  return {
    schemaVersion: 1,
    templateKey: template.templateKey,
    industry: template.industry,
    displayName: template.displayName,
    description: template.description,
    featureDefaults: template.featureDefaults,
    settingsDefaults: {
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      industry: template.industry,
    },
    brandingDefaults: baseBrandingDefaults,
    memberPortal: {
      layout: {
        shell: "mobile_bottom_tabs",
        breakpoints: ["mobile", "tablet", "desktop"],
      },
      navigation: template.memberNavigation.map(buildMemberNavigationItem),
      pages: template.memberPages.map(buildMemberPage),
    },
    adminPanel: {
      layout: {
        shell: "sidebar_topbar",
        breakpoints: ["desktop", "tablet"],
      },
      menu: template.adminMenu.map(buildAdminMenuItem),
      pages: template.adminPages.map(buildAdminPage),
    },
    editableZones: {
      memberPortal: true,
      adminPanel: true,
      featureDefaults: true,
      settingsDefaults: true,
    },
  };
}

const templateSeeds: TemplateSeedDefinition[] = [
  {
    templateKey: "fitness",
    industry: "fitness",
    displayName: "Fitness Base",
    description: "Structure-first template for gyms and fitness studios.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: true,
      classes_enabled: true,
      subscriptions_enabled: true,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: false,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.classes",
        labelKey: "nav.classes",
        icon: "calendar-days",
        route: "/member/classes",
      },
      {
        id: "member.bookings",
        labelKey: "nav.bookings",
        icon: "calendar-check",
        route: "/member/bookings",
      },
      {
        id: "member.membership",
        labelKey: "nav.membership",
        icon: "badge-check",
        route: "/member/membership",
      },
      {
        id: "member.invoices",
        labelKey: "nav.invoices",
        icon: "receipt",
        route: "/member/invoices",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "membership_status", "upcoming_bookings"],
      },
      {
        id: "member.classes",
        titleKey: "page.member.classes",
        blocks: ["class_schedule"],
      },
      {
        id: "member.bookings",
        titleKey: "page.member.bookings",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.membership",
        titleKey: "page.member.membership",
        blocks: ["membership_status"],
      },
      {
        id: "member.invoices",
        titleKey: "page.member.invoices",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.members",
        labelKey: "menu.members",
        icon: "users",
        route: "/members",
      },
      {
        id: "admin.class_ops",
        labelKey: "menu.classOps",
        icon: "dumbbell",
        route: "/classes",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments", "new_members"],
      },
      {
        id: "admin.class_ops",
        titleKey: "page.admin.classOps",
        widgets: ["today_schedule", "staff_utilization"],
      },
      {
        id: "admin.billing",
        titleKey: "page.admin.billing",
        widgets: ["pending_payments"],
      },
    ],
  },
  {
    templateKey: "salon",
    industry: "salon",
    displayName: "Salon Base",
    description: "Structure-first template for beauty and salon operators.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: false,
      classes_enabled: false,
      subscriptions_enabled: false,
      pos_enabled: true,
      loyalty_enabled: true,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.appointments",
        labelKey: "nav.appointments",
        icon: "calendar-check",
        route: "/member/appointments",
      },
      {
        id: "member.services",
        labelKey: "nav.services",
        icon: "scissors",
        route: "/member/services",
      },
      {
        id: "member.rewards",
        labelKey: "nav.rewards",
        icon: "gift",
        route: "/member/rewards",
      },
      {
        id: "member.invoices",
        labelKey: "nav.invoices",
        icon: "receipt",
        route: "/member/invoices",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "upcoming_bookings"],
      },
      {
        id: "member.appointments",
        titleKey: "page.member.appointments",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.services",
        titleKey: "page.member.services",
        blocks: ["service_catalog"],
      },
      {
        id: "member.rewards",
        titleKey: "page.member.rewards",
        blocks: ["loyalty_balance"],
      },
      {
        id: "member.invoices",
        titleKey: "page.member.invoices",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.schedule",
        labelKey: "menu.schedule",
        icon: "calendar-days",
        route: "/schedule",
      },
      {
        id: "admin.staff",
        labelKey: "menu.staff",
        icon: "users",
        route: "/staff",
      },
      {
        id: "admin.pos",
        labelKey: "menu.pos",
        icon: "scan-line",
        route: "/pos",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments"],
      },
      {
        id: "admin.schedule",
        titleKey: "page.admin.schedule",
        widgets: ["today_schedule", "staff_utilization"],
      },
      {
        id: "admin.pos",
        titleKey: "page.admin.pos",
        widgets: ["pending_payments", "inventory_alerts"],
      },
    ],
  },
  {
    templateKey: "mssp",
    industry: "mssp",
    displayName: "MSSP Base",
    description: "Structure-first template for managed service providers.",
    featureDefaults: {
      bookings_enabled: false,
      memberships_enabled: true,
      classes_enabled: false,
      subscriptions_enabled: true,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.subscription",
        labelKey: "nav.subscription",
        icon: "shield-check",
        route: "/member/subscription",
      },
      {
        id: "member.services",
        labelKey: "nav.services",
        icon: "server",
        route: "/member/services",
      },
      {
        id: "member.invoices",
        labelKey: "nav.invoices",
        icon: "receipt",
        route: "/member/invoices",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "membership_status"],
      },
      {
        id: "member.subscription",
        titleKey: "page.member.subscription",
        blocks: ["membership_status"],
      },
      {
        id: "member.services",
        titleKey: "page.member.services",
        blocks: ["service_catalog"],
      },
      {
        id: "member.invoices",
        titleKey: "page.member.invoices",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.clients",
        labelKey: "menu.clients",
        icon: "building-2",
        route: "/clients",
      },
      {
        id: "admin.ticket_queue",
        labelKey: "menu.ticketQueue",
        icon: "list-checks",
        route: "/tickets",
      },
      {
        id: "admin.compliance",
        labelKey: "menu.compliance",
        icon: "shield-alert",
        route: "/compliance",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "pending_payments", "compliance_tasks"],
      },
      {
        id: "admin.ticket_queue",
        titleKey: "page.admin.ticketQueue",
        widgets: ["today_schedule", "compliance_tasks"],
      },
      {
        id: "admin.billing",
        titleKey: "page.admin.billing",
        widgets: ["pending_payments"],
      },
    ],
  },
  {
    templateKey: "retail",
    industry: "retail",
    displayName: "Retail Base",
    description: "Structure-first template for retail operations.",
    featureDefaults: {
      bookings_enabled: false,
      memberships_enabled: false,
      classes_enabled: false,
      subscriptions_enabled: false,
      pos_enabled: true,
      loyalty_enabled: true,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.catalog",
        labelKey: "nav.catalog",
        icon: "shopping-bag",
        route: "/member/catalog",
      },
      {
        id: "member.orders",
        labelKey: "nav.orders",
        icon: "package",
        route: "/member/orders",
      },
      {
        id: "member.rewards",
        labelKey: "nav.rewards",
        icon: "gift",
        route: "/member/rewards",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "loyalty_balance"],
      },
      {
        id: "member.catalog",
        titleKey: "page.member.catalog",
        blocks: ["service_catalog"],
      },
      {
        id: "member.orders",
        titleKey: "page.member.orders",
        blocks: ["invoice_history"],
      },
      {
        id: "member.rewards",
        titleKey: "page.member.rewards",
        blocks: ["loyalty_balance"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.orders",
        labelKey: "menu.orders",
        icon: "package-check",
        route: "/orders",
      },
      {
        id: "admin.inventory",
        labelKey: "menu.inventory",
        icon: "boxes",
        route: "/inventory",
      },
      {
        id: "admin.pos",
        labelKey: "menu.pos",
        icon: "scan-line",
        route: "/pos",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "pending_payments", "inventory_alerts"],
      },
      {
        id: "admin.orders",
        titleKey: "page.admin.orders",
        widgets: ["today_schedule", "pending_payments"],
      },
      {
        id: "admin.inventory",
        titleKey: "page.admin.inventory",
        widgets: ["inventory_alerts"],
      },
    ],
  },
  {
    templateKey: "restaurant",
    industry: "restaurant",
    displayName: "Restaurant Base",
    description: "Structure-first template for restaurant and F&B operators.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: false,
      classes_enabled: false,
      subscriptions_enabled: false,
      pos_enabled: true,
      loyalty_enabled: true,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.reservations",
        labelKey: "nav.reservations",
        icon: "calendar-check",
        route: "/member/reservations",
      },
      {
        id: "member.menu",
        labelKey: "nav.menu",
        icon: "utensils",
        route: "/member/menu",
      },
      {
        id: "member.rewards",
        labelKey: "nav.rewards",
        icon: "gift",
        route: "/member/rewards",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["upcoming_bookings", "loyalty_balance"],
      },
      {
        id: "member.reservations",
        titleKey: "page.member.reservations",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.menu",
        titleKey: "page.member.menu",
        blocks: ["service_catalog"],
      },
      {
        id: "member.rewards",
        titleKey: "page.member.rewards",
        blocks: ["loyalty_balance", "invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.table_ops",
        labelKey: "menu.tableOps",
        icon: "table",
        route: "/tables",
      },
      {
        id: "admin.kitchen",
        labelKey: "menu.kitchen",
        icon: "chef-hat",
        route: "/kitchen",
      },
      {
        id: "admin.pos",
        labelKey: "menu.pos",
        icon: "scan-line",
        route: "/pos",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments"],
      },
      {
        id: "admin.table_ops",
        titleKey: "page.admin.tableOps",
        widgets: ["today_schedule", "staff_utilization"],
      },
      {
        id: "admin.pos",
        titleKey: "page.admin.pos",
        widgets: ["pending_payments", "inventory_alerts"],
      },
    ],
  },
  {
    templateKey: "wellness",
    industry: "wellness",
    displayName: "Wellness Base",
    description: "Structure-first template for wellness centres and studios.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: true,
      classes_enabled: false,
      subscriptions_enabled: true,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.programs",
        labelKey: "nav.programs",
        icon: "sparkles",
        route: "/member/programs",
      },
      {
        id: "member.appointments",
        labelKey: "nav.appointments",
        icon: "calendar-check",
        route: "/member/appointments",
      },
      {
        id: "member.packages",
        labelKey: "nav.packages",
        icon: "package",
        route: "/member/packages",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "membership_status", "upcoming_bookings"],
      },
      {
        id: "member.programs",
        titleKey: "page.member.programs",
        blocks: ["service_catalog"],
      },
      {
        id: "member.appointments",
        titleKey: "page.member.appointments",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.packages",
        titleKey: "page.member.packages",
        blocks: ["membership_status", "invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.practitioners",
        labelKey: "menu.practitioners",
        icon: "users",
        route: "/practitioners",
      },
      {
        id: "admin.sessions",
        labelKey: "menu.sessions",
        icon: "calendar-days",
        route: "/sessions",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments"],
      },
      {
        id: "admin.practitioners",
        titleKey: "page.admin.practitioners",
        widgets: ["staff_utilization"],
      },
      {
        id: "admin.sessions",
        titleKey: "page.admin.sessions",
        widgets: ["today_schedule", "staff_utilization"],
      },
    ],
  },
  {
    templateKey: "coaching",
    industry: "coaching",
    displayName: "Coaching Base",
    description: "Structure-first template for coaching and mentoring teams.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: true,
      classes_enabled: false,
      subscriptions_enabled: true,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.sessions",
        labelKey: "nav.sessions",
        icon: "calendar-check",
        route: "/member/sessions",
      },
      {
        id: "member.progress",
        labelKey: "nav.progress",
        icon: "trending-up",
        route: "/member/progress",
      },
      {
        id: "member.billing",
        labelKey: "nav.billing",
        icon: "receipt",
        route: "/member/billing",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "membership_status"],
      },
      {
        id: "member.sessions",
        titleKey: "page.member.sessions",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.progress",
        titleKey: "page.member.progress",
        blocks: ["member_summary"],
      },
      {
        id: "member.billing",
        titleKey: "page.member.billing",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.pipeline",
        labelKey: "menu.pipeline",
        icon: "users",
        route: "/pipeline",
      },
      {
        id: "admin.sessions",
        labelKey: "menu.sessions",
        icon: "calendar-days",
        route: "/sessions",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "new_members", "today_schedule"],
      },
      {
        id: "admin.pipeline",
        titleKey: "page.admin.pipeline",
        widgets: ["new_members", "staff_utilization"],
      },
      {
        id: "admin.billing",
        titleKey: "page.admin.billing",
        widgets: ["pending_payments"],
      },
    ],
  },
  {
    templateKey: "physio",
    industry: "physio",
    displayName: "Physio Base",
    description: "Structure-first template for physiotherapy practices.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: false,
      classes_enabled: false,
      subscriptions_enabled: false,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.treatment_plan",
        labelKey: "nav.treatmentPlan",
        icon: "clipboard-list",
        route: "/member/treatment-plan",
      },
      {
        id: "member.appointments",
        labelKey: "nav.appointments",
        icon: "calendar-check",
        route: "/member/appointments",
      },
      {
        id: "member.invoices",
        labelKey: "nav.invoices",
        icon: "receipt",
        route: "/member/invoices",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "upcoming_bookings"],
      },
      {
        id: "member.treatment_plan",
        titleKey: "page.member.treatmentPlan",
        blocks: ["service_catalog"],
      },
      {
        id: "member.appointments",
        titleKey: "page.member.appointments",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.invoices",
        titleKey: "page.member.invoices",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.caseload",
        labelKey: "menu.caseload",
        icon: "clipboard-check",
        route: "/caseload",
      },
      {
        id: "admin.sessions",
        labelKey: "menu.sessions",
        icon: "calendar-days",
        route: "/sessions",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
      {
        id: "admin.compliance",
        labelKey: "menu.compliance",
        icon: "shield-check",
        route: "/compliance",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments"],
      },
      {
        id: "admin.caseload",
        titleKey: "page.admin.caseload",
        widgets: ["new_members", "staff_utilization"],
      },
      {
        id: "admin.compliance",
        titleKey: "page.admin.compliance",
        widgets: ["compliance_tasks"],
      },
    ],
  },
  {
    templateKey: "clinic",
    industry: "clinic",
    displayName: "Clinic Base",
    description: "Structure-first template for outpatient clinic operations.",
    featureDefaults: {
      bookings_enabled: true,
      memberships_enabled: false,
      classes_enabled: false,
      subscriptions_enabled: false,
      pos_enabled: false,
      loyalty_enabled: false,
      einvoice_enabled: true,
      turnstile_enabled: false,
    },
    memberNavigation: [
      { id: "member.home", labelKey: "nav.home", icon: "home", route: "/member/home" },
      {
        id: "member.appointments",
        labelKey: "nav.appointments",
        icon: "calendar-check",
        route: "/member/appointments",
      },
      {
        id: "member.services",
        labelKey: "nav.services",
        icon: "stethoscope",
        route: "/member/services",
      },
      {
        id: "member.invoices",
        labelKey: "nav.invoices",
        icon: "receipt",
        route: "/member/invoices",
      },
    ],
    memberPages: [
      {
        id: "member.home",
        titleKey: "page.member.home",
        blocks: ["member_summary", "upcoming_bookings"],
      },
      {
        id: "member.appointments",
        titleKey: "page.member.appointments",
        blocks: ["upcoming_bookings"],
      },
      {
        id: "member.services",
        titleKey: "page.member.services",
        blocks: ["service_catalog"],
      },
      {
        id: "member.invoices",
        titleKey: "page.member.invoices",
        blocks: ["invoice_history"],
      },
    ],
    adminMenu: [
      {
        id: "admin.dashboard",
        labelKey: "menu.dashboard",
        icon: "layout-dashboard",
        route: "/dashboard",
      },
      {
        id: "admin.front_desk",
        labelKey: "menu.frontDesk",
        icon: "clipboard-list",
        route: "/front-desk",
      },
      {
        id: "admin.practitioners",
        labelKey: "menu.practitioners",
        icon: "users",
        route: "/practitioners",
      },
      {
        id: "admin.billing",
        labelKey: "menu.billing",
        icon: "credit-card",
        route: "/billing",
      },
      {
        id: "admin.compliance",
        labelKey: "menu.compliance",
        icon: "shield-alert",
        route: "/compliance",
      },
    ],
    adminPages: [
      {
        id: "admin.dashboard",
        titleKey: "page.admin.dashboard",
        widgets: ["kpi_overview", "today_schedule", "pending_payments", "new_members"],
      },
      {
        id: "admin.front_desk",
        titleKey: "page.admin.frontDesk",
        widgets: ["today_schedule", "new_members"],
      },
      {
        id: "admin.compliance",
        titleKey: "page.admin.compliance",
        widgets: ["compliance_tasks"],
      },
    ],
  },
];

async function seedTemplates() {
  const now = new Date();
  const counters = {
    templatesInserted: 0,
    templatesUpdated: 0,
    versionsInserted: 0,
    versionsUpdated: 0,
  };

  console.log("\nSeeding tenant templates (structure only)...\n");

  for (const template of templateSeeds) {
    const definition = buildTemplateDefinition(template);

    const existingTemplate = await db
      .select({ id: tenantTemplates.id })
      .from(tenantTemplates)
      .where(eq(tenantTemplates.key, template.templateKey))
      .limit(1);

    const templateId = existingTemplate[0]?.id ?? generateId();

    if (existingTemplate.length === 0) {
      await db.insert(tenantTemplates).values({
        id: templateId,
        key: template.templateKey,
        industry: template.industry,
        name: template.displayName,
        status: "published",
        current_version: 1,
      });
      counters.templatesInserted += 1;
    } else {
      await db
        .update(tenantTemplates)
        .set({
          industry: template.industry,
          name: template.displayName,
          status: "published",
          current_version: 1,
          updated_at: now,
        })
        .where(eq(tenantTemplates.id, templateId));
      counters.templatesUpdated += 1;
    }

    const existingVersion = await db
      .select({ id: tenantTemplateVersions.id })
      .from(tenantTemplateVersions)
      .where(
        and(
          eq(tenantTemplateVersions.template_id, templateId),
          eq(tenantTemplateVersions.version, 1),
        ),
      )
      .limit(1);

    if (existingVersion.length === 0) {
      await db.insert(tenantTemplateVersions).values({
        id: generateId(),
        template_id: templateId,
        version: 1,
        schema_version: 1,
        definition,
        is_published: true,
        published_at: now,
      });
      counters.versionsInserted += 1;
    } else {
      await db
        .update(tenantTemplateVersions)
        .set({
          schema_version: 1,
          definition,
          is_published: true,
          published_at: now,
        })
        .where(eq(tenantTemplateVersions.id, existingVersion[0].id));
      counters.versionsUpdated += 1;
    }

    console.log(`  ✓ ${template.templateKey} (version 1 published)`);
  }

  console.log("\nTenant template seed complete.");
  console.log(`  Templates inserted: ${counters.templatesInserted}`);
  console.log(`  Templates updated:  ${counters.templatesUpdated}`);
  console.log(`  Versions inserted:  ${counters.versionsInserted}`);
  console.log(`  Versions updated:   ${counters.versionsUpdated}`);
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error("\nTenant template seed failed:", error);
  process.exit(1);
});
