import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
}));

vi.mock("@timeo/db", () => ({
  db: mockDb,
}));

vi.mock("@timeo/db/schema", () => ({
  featureFlags: {
    id: "id",
    key: "key",
    name: "name",
    description: "description",
    phase: "phase",
    default_enabled: "default_enabled",
  },
  featureFlagOverrides: {
    id: "id",
    feature_flag_id: "feature_flag_id",
    tenant_id: "tenant_id",
    enabled: "enabled",
  },
  tenantTemplateAssignments: {
    id: "id",
    tenant_id: "tenant_id",
    template_id: "template_id",
    template_version_id: "template_version_id",
    industry_snapshot: "industry_snapshot",
    source: "source",
    is_pinned: "is_pinned",
    applied_at: "applied_at",
  },
  tenantTemplates: {
    id: "id",
    key: "key",
    name: "name",
    industry: "industry",
  },
  tenantTemplateVersions: {
    id: "id",
    template_id: "template_id",
    version: "version",
    definition: "definition",
  },
  tenantUiOverrides: {
    id: "id",
    tenant_id: "tenant_id",
    member_portal_override: "member_portal_override",
    admin_panel_override: "admin_panel_override",
    revision: "revision",
  },
}));

vi.mock("@timeo/shared", () => ({
  ALLOWED_ADMIN_WIDGET_TYPES: [
    "kpi_overview",
    "today_schedule",
    "pending_payments",
    "new_members",
    "inventory_alerts",
    "staff_utilization",
    "compliance_tasks",
  ],
  ALLOWED_MEMBER_BLOCK_TYPES: [
    "member_summary",
    "upcoming_bookings",
    "membership_status",
    "class_schedule",
    "service_catalog",
    "invoice_history",
    "loyalty_balance",
  ],
  TEMPLATE_INDUSTRIES: [
    "fitness",
    "salon",
    "mssp",
    "retail",
    "restaurant",
    "wellness",
    "coaching",
    "physio",
    "clinic",
  ],
  isAllowedAdminWidgetType: (value: string) =>
    [
      "kpi_overview",
      "today_schedule",
      "pending_payments",
      "new_members",
      "inventory_alerts",
      "staff_utilization",
      "compliance_tasks",
    ].includes(value),
  isAllowedMemberBlockType: (value: string) =>
    [
      "member_summary",
      "upcoming_bookings",
      "membership_status",
      "class_schedule",
      "service_catalog",
      "invoice_history",
      "loyalty_balance",
    ].includes(value),
  isTemplateIndustry: (value: string) =>
    [
      "fitness",
      "salon",
      "mssp",
      "retail",
      "restaurant",
      "wellness",
      "coaching",
      "physio",
      "clinic",
    ].includes(value),
}));

import {
  getEffectiveFeatureFlags,
  resolveTenantUiConfig,
} from "../services/template-resolver.js";

function makeSelectChain(rows: unknown[]) {
  const chain = {
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (onFulfilled: (value: unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

describe("template resolver service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges tenant overrides with template definition", async () => {
    const assignmentRows = [
      {
        assignmentId: "assign_1",
        templateId: "tpl_1",
        templateVersionId: "tplv_1",
        industrySnapshot: "fitness",
        source: "platform_assignment",
        isPinned: false,
        appliedAt: new Date("2026-01-01"),
        templateKey: "fitness",
        templateName: "Fitness Base",
        templateIndustry: "fitness",
        version: 1,
        definition: {
          schemaVersion: 1,
          templateKey: "fitness",
          industry: "fitness",
          displayName: "Fitness Base",
          featureDefaults: {
            bookings_enabled: true,
          },
          settingsDefaults: {},
          brandingDefaults: {},
          memberPortal: {
            layout: { shell: "mobile_bottom_tabs" },
            navigation: [
              {
                id: "member.home",
                labelKey: "nav.home",
                icon: "home",
                route: "/member/home",
                pageId: "member.home",
                visibility: { requiresFlags: [] },
              },
            ],
            pages: [
              {
                id: "member.home",
                titleKey: "page.member.home",
                blocks: [
                  {
                    id: "member.home.block.1",
                    type: "member_summary",
                    config: {},
                    visibility: { requiresFlags: [] },
                  },
                ],
              },
            ],
          },
          adminPanel: {
            layout: { shell: "sidebar_topbar" },
            menu: [
              {
                id: "admin.dashboard",
                labelKey: "menu.dashboard",
                icon: "layout-dashboard",
                route: "/dashboard",
                pageId: "admin.dashboard",
                visibility: { requiresFlags: [] },
              },
            ],
            pages: [
              {
                id: "admin.dashboard",
                titleKey: "page.admin.dashboard",
                widgets: [
                  {
                    id: "admin.dashboard.widget.1",
                    type: "kpi_overview",
                    config: {},
                    visibility: { requiresFlags: [] },
                  },
                ],
              },
            ],
          },
          editableZones: {
            memberPortal: true,
            adminPanel: true,
            featureDefaults: true,
            settingsDefaults: true,
          },
        },
      },
    ];

    const overrideRows = [
      {
        memberPortalOverride: {
          navigation: [
            {
              id: "member.custom",
              labelKey: "nav.custom",
              icon: "sparkles",
              route: "/member/custom",
              pageId: "member.custom",
              visibility: { requiresFlags: [] },
            },
          ],
        },
        adminPanelOverride: {
          menu: [
            {
              id: "admin.custom",
              labelKey: "menu.custom",
              icon: "sparkles",
              route: "/custom",
              pageId: "admin.custom",
              visibility: { requiresFlags: [] },
            },
          ],
        },
        revision: 2,
      },
    ];

    mockDb.select
      .mockReturnValueOnce(makeSelectChain(assignmentRows))
      .mockReturnValueOnce(makeSelectChain(overrideRows));

    const result = await resolveTenantUiConfig("tenant_1");

    expect(result.assignment?.templateId).toBe("tpl_1");
    expect((result.memberPortal as any).navigation[0].id).toBe("member.custom");
    expect((result.adminPanel as any).menu[0].id).toBe("admin.custom");
    expect(result.featureDefaults.bookings_enabled).toBe(true);
    expect(result.overrideRevision).toBe(2);
  });

  it("resolves feature flags with override/template/global precedence", async () => {
    const assignmentRows = [
      {
        assignmentId: "assign_2",
        templateId: "tpl_2",
        templateVersionId: "tplv_2",
        industrySnapshot: "fitness",
        source: "platform_assignment",
        isPinned: false,
        appliedAt: new Date("2026-01-01"),
        templateKey: "fitness",
        templateName: "Fitness Base",
        templateIndustry: "fitness",
        version: 1,
        definition: {
          schemaVersion: 1,
          templateKey: "fitness",
          industry: "fitness",
          displayName: "Fitness Base",
          featureDefaults: {
            bookings_enabled: false,
          },
          settingsDefaults: {},
          brandingDefaults: {},
          memberPortal: {
            layout: {},
            navigation: [],
            pages: [],
          },
          adminPanel: {
            layout: {},
            menu: [],
            pages: [],
          },
          editableZones: {
            memberPortal: true,
            adminPanel: true,
            featureDefaults: true,
            settingsDefaults: true,
          },
        },
      },
    ];

    const overrideRows = [
      {
        memberPortalOverride: {},
        adminPanelOverride: {},
        revision: 0,
      },
    ];

    const allFlags = [
      {
        id: "flag_1",
        key: "bookings_enabled",
        name: "Bookings",
        description: "Bookings module",
        phase: null,
        default_enabled: true,
      },
      {
        id: "flag_2",
        key: "pos_enabled",
        name: "POS",
        description: "POS module",
        phase: null,
        default_enabled: false,
      },
      {
        id: "flag_3",
        key: "classes_enabled",
        name: "Classes",
        description: "Classes module",
        phase: null,
        default_enabled: true,
      },
    ];

    const tenantOverrides = [
      {
        id: "ovr_1",
        feature_flag_id: "flag_2",
        tenant_id: "tenant_2",
        enabled: true,
      },
    ];

    mockDb.select
      .mockReturnValueOnce(makeSelectChain(assignmentRows))
      .mockReturnValueOnce(makeSelectChain(overrideRows))
      .mockReturnValueOnce(makeSelectChain(allFlags))
      .mockReturnValueOnce(makeSelectChain(tenantOverrides));

    const result = await getEffectiveFeatureFlags("tenant_2");

    const bookings = result.find((flag) => flag.key === "bookings_enabled");
    const pos = result.find((flag) => flag.key === "pos_enabled");
    const classes = result.find((flag) => flag.key === "classes_enabled");

    expect(bookings?.enabled).toBe(false);
    expect(bookings?.source).toBe("template");

    expect(pos?.enabled).toBe(true);
    expect(pos?.source).toBe("override");

    expect(classes?.enabled).toBe(true);
    expect(classes?.source).toBe("global");
  });
});
