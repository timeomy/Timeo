export const queryKeys = {
  tenants: {
    all: () => ["tenants"] as const,
    mine: () => ["tenants", "mine"] as const,
    public: (search?: string) => ["tenants", "public", search ?? ""] as const,
    byId: (id: string) => ["tenants", id] as const,
    bySlug: (slug: string) => ["tenants", "slug", slug] as const,
    featureFlags: (id: string) => ["tenants", id, "feature-flags"] as const,
  },

  bookings: {
    all: (tenantId: string) => ["bookings", tenantId] as const,
    mine: (tenantId: string) => ["bookings", tenantId, "mine"] as const,
    byId: (tenantId: string, id: string) => ["bookings", tenantId, id] as const,
    byStaff: (tenantId: string, staffId: string) =>
      ["bookings", tenantId, "staff", staffId] as const,
    available: (tenantId: string, serviceId: string, date: string) =>
      ["bookings", tenantId, "available", serviceId, date] as const,
  },

  services: {
    all: (tenantId: string) => ["services", tenantId] as const,
    byId: (tenantId: string, id: string) => ["services", tenantId, id] as const,
  },

  products: {
    all: (tenantId: string) => ["products", tenantId] as const,
    byId: (tenantId: string, id: string) => ["products", tenantId, id] as const,
  },

  orders: {
    all: (tenantId: string) => ["orders", tenantId] as const,
    byId: (tenantId: string, id: string) => ["orders", tenantId, id] as const,
  },

  pos: {
    all: (tenantId: string) => ["pos", tenantId] as const,
    byId: (tenantId: string, id: string) => ["pos", tenantId, id] as const,
  },

  checkIns: {
    all: (tenantId: string) => ["checkIns", tenantId] as const,
    qrCode: (tenantId: string) => ["checkIns", tenantId, "qrCode"] as const,
  },

  sessions: {
    packages: (tenantId: string) => ["sessions", tenantId, "packages"] as const,
    credits: (tenantId: string, userId?: string) =>
      ["sessions", tenantId, "credits", userId] as const,
    logs: (tenantId: string) => ["sessions", tenantId, "logs"] as const,
  },

  memberships: {
    all: (tenantId: string) => ["memberships", tenantId] as const,
    byId: (tenantId: string, id: string) => ["memberships", tenantId, id] as const,
  },

  vouchers: {
    all: (tenantId: string) => ["vouchers", tenantId] as const,
    byId: (tenantId: string, id: string) => ["vouchers", tenantId, id] as const,
  },

  giftCards: {
    all: (tenantId: string) => ["giftCards", tenantId] as const,
    byId: (tenantId: string, id: string) => ["giftCards", tenantId, id] as const,
    byCode: (tenantId: string, code: string) =>
      ["giftCards", tenantId, "code", code] as const,
  },

  scheduling: {
    availability: (tenantId: string, staffId: string) =>
      ["scheduling", tenantId, "availability", staffId] as const,
    businessHours: (tenantId: string) =>
      ["scheduling", tenantId, "businessHours"] as const,
    blockedSlots: (tenantId: string) =>
      ["scheduling", tenantId, "blockedSlots"] as const,
  },

  notifications: {
    all: (tenantId: string) => ["notifications", tenantId] as const,
  },

  analytics: {
    revenue: (tenantId: string, period?: string) =>
      ["analytics", tenantId, "revenue", period] as const,
    bookings: (tenantId: string, period?: string) =>
      ["analytics", tenantId, "bookings", period] as const,
    orders: (tenantId: string, period?: string) =>
      ["analytics", tenantId, "orders", period] as const,
    topServices: (tenantId: string) =>
      ["analytics", tenantId, "topServices"] as const,
    topProducts: (tenantId: string) =>
      ["analytics", tenantId, "topProducts"] as const,
    customers: (tenantId: string) =>
      ["analytics", tenantId, "customers"] as const,
    staff: (tenantId: string) => ["analytics", tenantId, "staff"] as const,
    revenueTrend: (tenantId: string, period?: string) =>
      ["analytics", tenantId, "revenueTrend", period] as const,
    bookingTrend: (tenantId: string, period?: string) =>
      ["analytics", tenantId, "bookingTrend", period] as const,
  },

  platform: {
    tenants: () => ["platform", "tenants"] as const,
    tenant: (id: string) => ["platform", "tenants", id] as const,
    tenantMembers: (id: string) => ["platform", "tenants", id, "members"] as const,
    config: () => ["platform", "config"] as const,
    configSection: (section: string) => ["platform", "config", section] as const,
    flags: () => ["platform", "feature-flags"] as const,
    flag: (id: string) => ["platform", "feature-flags", id] as const,
    plans: () => ["platform", "plans"] as const,
    plan: (id: string) => ["platform", "plans", id] as const,
    logs: () => ["platform", "logs"] as const,
    auditLogs: (params?: Record<string, string>) =>
      ["platform", "audit-log", params ?? {}] as const,
    overview: () => ["platform", "overview"] as const,
    stats: () => ["platform", "stats"] as const,
    health: () => ["platform", "health"] as const,
    users: () => ["platform", "users"] as const,
    user: (id: string) => ["platform", "users", id] as const,
    subscriptions: () => ["platform", "subscriptions"] as const,
    announcements: () => ["platform", "announcements"] as const,
    announcement: (id: string) => ["platform", "announcements", id] as const,
    emailTemplates: () => ["platform", "email-templates"] as const,
    apiKeys: () => ["platform", "api-keys"] as const,
    analytics: (range: string) => ["platform", "analytics", range] as const,
    analyticsOverview: () => ["platform", "analytics", "overview"] as const,
    analyticsTenants: (days?: number) =>
      ["platform", "analytics", "tenants", days ?? 30] as const,
  },

  files: {
    all: (tenantId: string) => ["files", tenantId] as const,
  },

  einvoice: {
    all: (tenantId: string) => ["einvoice", tenantId] as const,
    byId: (tenantId: string, id: string) => ["einvoice", tenantId, id] as const,
  },

  payments: {
    all: (tenantId: string) => ["payments", tenantId] as const,
    byId: (tenantId: string, id: string) => ["payments", tenantId, id] as const,
  },

  staff: {
    all: (tenantId: string) => ["staff", tenantId] as const,
  },

  customers: {
    all: (tenantId: string) => ["customers", tenantId] as const,
    byId: (tenantId: string, id: string) => ["customers", tenantId, id] as const,
  },

  loyalty: {
    all: (tenantId: string) => ["loyalty", tenantId] as const,
    balance: (tenantId: string, userId: string) =>
      ["loyalty", tenantId, "balance", userId] as const,
    history: (tenantId: string, userId: string) =>
      ["loyalty", tenantId, "history", userId] as const,
  },
};
