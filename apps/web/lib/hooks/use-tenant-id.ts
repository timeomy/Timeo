"use client";

import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";

/**
 * Resolves the current tenant for the user.
 *
 * Priority:
 * 1. Clerk org → Convex tenant (via getByClerkOrgId)
 * 2. Fallback: first Convex tenant membership (for legacy users without Clerk orgs)
 */
export function useTenantId() {
  const { activeTenantId } = useTimeoWebAuthContext();

  // Primary: resolve via Clerk org
  const tenantFromClerk = useQuery(
    api.tenants.getByClerkOrgId,
    activeTenantId ? { clerkOrgId: activeTenantId } : "skip"
  );

  // Fallback: resolve via Convex memberships (legacy users without Clerk orgs)
  const myTenants = useQuery(
    api.tenants.getMyTenants,
    !activeTenantId ? {} : "skip"
  );

  // Pick the resolved tenant
  const tenant = activeTenantId ? tenantFromClerk : (myTenants?.[0] ?? null);

  const isLoading = activeTenantId
    ? tenantFromClerk === undefined
    : myTenants === undefined;

  return {
    /** Convex tenant _id (use this for all API calls) */
    tenantId: tenant?._id ?? null,
    /** Full tenant record */
    tenant: tenant ?? null,
    /** Clerk Organization ID */
    clerkOrgId: activeTenantId,
    /** Still loading the tenant lookup */
    isLoading,
    /** Clerk org exists but no Convex tenant (needs onboarding sync) */
    needsSync: activeTenantId ? tenantFromClerk === null : false,
  };
}
