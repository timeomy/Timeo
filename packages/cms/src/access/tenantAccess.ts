import type { Access, FieldAccess } from "payload";

/**
 * Restricts access so users can only read/write documents belonging to their tenant.
 * Admins can access all tenants. Public users can read published content.
 */

export const isTenantAdmin: Access = ({ req }) => {
  if (!req.user) return false;

  // Platform admins can access everything
  if (req.user.role === "platform_admin") return true;

  // Tenant-scoped: only see own tenant's documents
  if (req.user.tenantId) {
    return {
      tenantId: { equals: req.user.tenantId },
    };
  }

  return false;
};

export const isTenantMember: Access = ({ req }) => {
  if (!req.user) return false;
  if (req.user.role === "platform_admin") return true;

  if (req.user.tenantId) {
    return {
      tenantId: { equals: req.user.tenantId },
    };
  }

  return false;
};

export const isPublishedOrTenantAdmin: Access = ({ req }) => {
  // Authenticated tenant admins can see all their tenant's content
  if (req.user) {
    if (req.user.role === "platform_admin") return true;

    if (req.user.tenantId) {
      return {
        tenantId: { equals: req.user.tenantId },
      };
    }
  }

  // Public users can only see published content
  return {
    status: { equals: "published" },
  };
};

export const canManageTenantContent: Access = ({ req }) => {
  if (!req.user) return false;
  if (req.user.role === "platform_admin") return true;

  const allowedRoles = ["admin", "staff"];
  if (req.user.tenantRole && allowedRoles.includes(req.user.tenantRole)) {
    return {
      tenantId: { equals: req.user.tenantId },
    };
  }

  return false;
};

export const tenantIdField: FieldAccess = ({ req }) => {
  // Only platform admins can directly set tenantId
  // For others, it's auto-set via hooks
  return req.user?.role === "platform_admin";
};
