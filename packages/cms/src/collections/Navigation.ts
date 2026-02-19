import type { CollectionConfig } from "payload";
import {
  isTenantMember,
  canManageTenantContent,
  tenantIdField,
} from "../access/tenantAccess";

export const Navigation: CollectionConfig = {
  slug: "navigation",
  admin: {
    useAsTitle: "name",
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
      index: true,
      admin: { position: "sidebar", readOnly: true },
      access: { update: tenantIdField },
    },
    {
      name: "name",
      type: "text",
      required: true,
      admin: { description: "e.g. 'Main Menu', 'Footer Menu'" },
    },
    {
      name: "position",
      type: "select",
      required: true,
      options: [
        { label: "Header", value: "header" },
        { label: "Footer", value: "footer" },
      ],
    },
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 10,
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
        },
        {
          name: "type",
          type: "select",
          defaultValue: "page",
          options: [
            { label: "Page", value: "page" },
            { label: "Custom URL", value: "custom" },
            { label: "Services", value: "services" },
            { label: "Products", value: "products" },
            { label: "Bookings", value: "bookings" },
          ],
        },
        {
          name: "page",
          type: "relationship",
          relationTo: "pages",
          admin: {
            condition: (_, siblingData) => siblingData?.type === "page",
          },
        },
        {
          name: "url",
          type: "text",
          admin: {
            condition: (_, siblingData) => siblingData?.type === "custom",
          },
        },
        {
          name: "openInNewTab",
          type: "checkbox",
          defaultValue: false,
        },
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
