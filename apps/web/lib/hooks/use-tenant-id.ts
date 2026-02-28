"use client";

import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";

/**
 * Resolves the current tenant for the user.
 * Returns the active tenantId (nanoid string) for use in all API calls.
 */
export function useTenantId() {
  const { activeTenantId } = useTimeoWebAuthContext();
  const { activeTenant, isLoading } = useTimeoWebTenantContext();

  return {
    /** Active tenant id (use this for all API calls) */
    tenantId: activeTenantId as string | null,
    /** Full tenant record */
    tenant: activeTenant,
    /** Still loading the tenant lookup */
    isLoading,
  };
}
