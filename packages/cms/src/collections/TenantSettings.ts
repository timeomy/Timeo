import type { CollectionConfig } from "payload";
import {
  isTenantMember,
  canManageTenantContent,
  tenantIdField,
} from "../access/tenantAccess";

export const TenantSettings: CollectionConfig = {
  slug: "tenant-settings",
  admin: {
    useAsTitle: "tenantId",
  },
  access: {
    read: isTenantMember,
    create: canManageTenantContent,
    update: canManageTenantContent,
    delete: canManageTenantContent,
  },
  fields: [
    {
      name: "tenantId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar", readOnly: true },
      access: { update: tenantIdField },
    },
    {
      name: "theme",
      type: "group",
      fields: [
        {
          name: "primaryColor",
          type: "text",
          defaultValue: "#0f172a",
          admin: { description: "Hex color (e.g. #0f172a)" },
        },
        {
          name: "accentColor",
          type: "text",
          defaultValue: "#3b82f6",
        },
        {
          name: "fontFamily",
          type: "select",
          defaultValue: "inter",
          options: [
            { label: "Inter", value: "inter" },
            { label: "Poppins", value: "poppins" },
            { label: "DM Sans", value: "dm-sans" },
            { label: "Outfit", value: "outfit" },
          ],
        },
      ],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        {
          name: "siteTitle",
          type: "text",
          label: "Site Title",
        },
        {
          name: "siteDescription",
          type: "textarea",
          label: "Site Description",
        },
        {
          name: "favicon",
          type: "upload",
          relationTo: "media",
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
          label: "Default Open Graph Image",
        },
      ],
    },
    {
      name: "customDomain",
      type: "text",
      admin: { description: "Custom domain (e.g. www.mybusiness.com)" },
    },
    {
      name: "socialLinks",
      type: "group",
      fields: [
        { name: "facebook", type: "text" },
        { name: "instagram", type: "text" },
        { name: "twitter", type: "text" },
        { name: "tiktok", type: "text" },
        { name: "whatsapp", type: "text" },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        if (req.user?.tenantId && !data?.tenantId) {
          return { ...data, tenantId: req.user.tenantId };
        }
        return data;
      },
    ],
  },
};
