"use client";

import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import type { TimeoRole } from "@timeo/auth/web";
import { getRoleHomePath as getRoleHomePathFromAuth } from "@timeo/auth/web";

export function getRoleHomePath(role: TimeoRole, _hasTenant?: boolean): string {
  return getRoleHomePathFromAuth(role);
}

export function useRoleRedirect() {
  const { activeRole, isLoaded, isSignedIn } = useTimeoWebAuthContext();
  const { tenants, isLoading } = useTimeoWebTenantContext();

  const homePath = getRoleHomePath(activeRole);

  return {
    homePath,
    activeRole,
    isReady: isLoaded && !isLoading,
    isSignedIn: !!isSignedIn,
    hasTenants: tenants.length > 0,
  };
}
