import type { CollectionConfig } from "payload";
import {
  isTenantMember,
  canManageTenantContent,
  tenantIdField,
} from "../access/tenantAccess";

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
  },
  admin: {
    useAsTitle: "alt",
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
      name: "alt",
      type: "text",
      required: true,
      label: "Alt Text",
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
