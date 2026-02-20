"use client";

import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";

/**
 * Resolves the Clerk Organization ID to a Convex tenant ID.
 * Returns { tenantId, tenant, isLoading } where tenantId is the Convex Id<"tenants">.
 */
export function useTenantId() {
  const { activeTenantId } = useTimeoWebAuthContext();

  const tenant = useQuery(
    api.tenants.getByClerkOrgId,
    activeTenantId ? { clerkOrgId: activeTenantId } : "skip"
  );

  return {
    /** Convex tenant _id (use this for all API calls) */
    tenantId: tenant?._id ?? null,
    /** Full tenant record */
    tenant: tenant ?? null,
    /** Clerk Organization ID */
    clerkOrgId: activeTenantId,
    /** Still loading the tenant lookup */
    isLoading: activeTenantId ? tenant === undefined : false,
    /** Clerk org exists but no Convex tenant (needs onboarding sync) */
    needsSync: activeTenantId ? tenant === null : false,
  };
}
