"use client";

import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";

/**
 * Resolves the current tenant for the user.
 *
 * With Better Auth, activeTenantId is already a Convex tenant _id,
 * so no additional lookup is needed.
 */
export function useTenantId() {
  const { activeTenantId } = useTimeoWebAuthContext();
  const { activeTenant, isLoading } = useTimeoWebTenantContext();

  return {
    /** Convex tenant _id (use this for all API calls) */
    tenantId: activeTenantId as any,
    /** Full tenant record */
    tenant: activeTenant,
    /** Still loading the tenant lookup */
    isLoading,
  };
}
