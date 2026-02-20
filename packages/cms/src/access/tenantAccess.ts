import type { Access, FieldAccess } from "payload";

/**
 * Restricts access so users can only read/write documents belonging to their tenant.
 * Admins can access all tenants. Public users can read published content.
 */

export const isTenantAdmin: Access = ({ req }) => {
  if (!req.user) return false;
  if (req.user.role === "platform_admin") return true;

  if (req.user.tenantId) {
    return { tenantId: { equals: req.user.tenantId } } as any;
  }

  return false;
};

export const isTenantMember: Access = ({ req }) => {
  if (!req.user) return false;
  if (req.user.role === "platform_admin") return true;

  if (req.user.tenantId) {
    return { tenantId: { equals: req.user.tenantId } } as any;
  }

  return false;
};

export const isPublishedOrTenantAdmin: Access = ({ req }) => {
  if (req.user) {
    if (req.user.role === "platform_admin") return true;

    if (req.user.tenantId) {
      return { tenantId: { equals: req.user.tenantId } } as any;
    }
  }

  return { status: { equals: "published" } } as any;
};

export const canManageTenantContent: Access = ({ req }) => {
  if (!req.user) return false;
  if (req.user.role === "platform_admin") return true;

  const allowedRoles = ["admin", "staff"];
  if (req.user.tenantRole && allowedRoles.includes(req.user.tenantRole)) {
    return { tenantId: { equals: req.user.tenantId } } as any;
  }

  return false;
};

export const tenantIdField: FieldAccess = ({ req }) => {
  return req.user?.role === "platform_admin";
};
