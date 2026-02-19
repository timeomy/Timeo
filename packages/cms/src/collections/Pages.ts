import type { CollectionConfig } from "payload";
import {
  isPublishedOrTenantAdmin,
  canManageTenantContent,
  tenantIdField,
} from "../access/tenantAccess";
import {
  HeroBlock,
  FeaturesBlock,
  TestimonialsBlock,
  PricingBlock,
  FAQBlock,
  ContactBlock,
  GalleryBlock,
} from "../blocks";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "tenantId", "updatedAt"],
  },
  access: {
    read: isPublishedOrTenantAdmin,
    create: canManageTenantContent,
    update: canManageTenantContent,
    delete: canManageTenantContent,
  },
  fields: [
    {
      name: "tenantId",
      type: "text",
      required: true,
      index: true,
      admin: { position: "sidebar", readOnly: true },
      access: { update: tenantIdField },
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: false, // Unique per tenant, enforced via hook
      index: true,
      admin: {
        description: "URL slug for this page (e.g. 'about', 'services')",
      },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isHomepage",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "seo",
      type: "group",
      fields: [
        {
          name: "metaTitle",
          type: "text",
          label: "Meta Title",
        },
        {
          name: "metaDescription",
          type: "textarea",
          label: "Meta Description",
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
          label: "Open Graph Image",
        },
      ],
    },
    {
      name: "blocks",
      type: "blocks",
      blocks: [
        HeroBlock,
        FeaturesBlock,
        TestimonialsBlock,
        PricingBlock,
        FAQBlock,
        ContactBlock,
        GalleryBlock,
      ],
    },
  ],
  hooks: {
    beforeChange: [
      // Auto-set tenantId from authenticated user
      ({ req, data }) => {
        if (req.user?.tenantId && !data?.tenantId) {
          return { ...data, tenantId: req.user.tenantId };
        }
        return data;
      },
    ],
    beforeValidate: [
      // Generate slug from title if not provided
      ({ data }) => {
        if (data?.title && !data?.slug) {
          return {
            ...data,
            slug: data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          };
        }
        return data;
      },
    ],
  },
};
