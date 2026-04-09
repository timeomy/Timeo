import { z } from "zod";
import {
  ALLOWED_ADMIN_WIDGET_TYPES,
  ALLOWED_MEMBER_BLOCK_TYPES,
  TEMPLATE_INDUSTRIES,
  isAllowedAdminWidgetType,
  isAllowedMemberBlockType,
  isTemplateIndustry,
} from "@timeo/shared";

const visibilitySchema = z
  .object({
    requiresFlags: z.array(z.string()).default([]),
    hidden: z.boolean().optional(),
  })
  .passthrough();

const memberNavigationItemSchema = z
  .object({
    id: z.string().min(1),
    labelKey: z.string().min(1),
    icon: z.string().min(1),
    route: z.string().min(1),
    pageId: z.string().min(1),
    visibility: visibilitySchema.default({ requiresFlags: [] }),
    hidden: z.boolean().optional(),
  })
  .passthrough();

const memberBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z
      .string()
      .min(1)
      .refine(
        (value) => isAllowedMemberBlockType(value),
        `Unsupported member block type. Allowed: ${ALLOWED_MEMBER_BLOCK_TYPES.join(", ")}`,
      ),
    config: z.record(z.unknown()).default({}),
    visibility: visibilitySchema.default({ requiresFlags: [] }),
    hidden: z.boolean().optional(),
  })
  .passthrough();

const memberPageSchema = z
  .object({
    id: z.string().min(1),
    titleKey: z.string().min(1),
    layout: z.string().optional(),
    blocks: z.array(memberBlockSchema).default([]),
    hidden: z.boolean().optional(),
  })
  .passthrough();

export const memberPortalSchema = z
  .object({
    layout: z.record(z.unknown()).default({}),
    navigation: z.array(memberNavigationItemSchema).default([]),
    pages: z.array(memberPageSchema).default([]),
  })
  .passthrough();

const adminMenuItemSchema = z
  .object({
    id: z.string().min(1),
    labelKey: z.string().min(1),
    icon: z.string().min(1),
    route: z.string().min(1),
    pageId: z.string().min(1),
    visibility: visibilitySchema.default({ requiresFlags: [] }),
    hidden: z.boolean().optional(),
  })
  .passthrough();

const adminWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z
      .string()
      .min(1)
      .refine(
        (value) => isAllowedAdminWidgetType(value),
        `Unsupported admin widget type. Allowed: ${ALLOWED_ADMIN_WIDGET_TYPES.join(", ")}`,
      ),
    config: z.record(z.unknown()).default({}),
    visibility: visibilitySchema.default({ requiresFlags: [] }),
    hidden: z.boolean().optional(),
  })
  .passthrough();

const adminPageSchema = z
  .object({
    id: z.string().min(1),
    titleKey: z.string().min(1),
    layout: z.string().optional(),
    widgets: z.array(adminWidgetSchema).default([]),
    hidden: z.boolean().optional(),
  })
  .passthrough();

export const adminPanelSchema = z
  .object({
    layout: z.record(z.unknown()).default({}),
    menu: z.array(adminMenuItemSchema).default([]),
    pages: z.array(adminPageSchema).default([]),
  })
  .passthrough();

export const tenantTemplateDefinitionSchema = z
  .object({
    schemaVersion: z.number().int().min(1),
    templateKey: z.string().min(1),
    industry: z
      .string()
      .min(1)
      .refine(
        (value) => isTemplateIndustry(value),
        `Unsupported industry. Allowed: ${TEMPLATE_INDUSTRIES.join(", ")}`,
      ),
    displayName: z.string().min(1),
    description: z.string().optional(),
    featureDefaults: z.record(z.boolean()).default({}),
    settingsDefaults: z.record(z.unknown()).default({}),
    brandingDefaults: z.record(z.unknown()).default({}),
    memberPortal: memberPortalSchema,
    adminPanel: adminPanelSchema,
    editableZones: z
      .object({
        memberPortal: z.boolean().default(true),
        adminPanel: z.boolean().default(true),
        featureDefaults: z.boolean().default(true),
        settingsDefaults: z.boolean().default(true),
      })
      .default({
        memberPortal: true,
        adminPanel: true,
        featureDefaults: true,
        settingsDefaults: true,
      }),
  })
  .passthrough();

export const memberPortalOverrideSchema = memberPortalSchema.partial();
export const adminPanelOverrideSchema = adminPanelSchema.partial();

export type TenantTemplateDefinition = z.infer<
  typeof tenantTemplateDefinitionSchema
>;
export type MemberPortalConfig = z.infer<typeof memberPortalSchema>;
export type AdminPanelConfig = z.infer<typeof adminPanelSchema>;
