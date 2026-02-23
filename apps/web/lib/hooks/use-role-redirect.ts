"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import type { TimeoRole } from "@timeo/auth/web";

export function getRoleHomePath(role: TimeoRole, hasTenant: boolean): string {
  if (role === "platform_admin" && !hasTenant) return "/platform";
  if (role === "customer") return "/portal";
  return "/dashboard";
}

export function useRoleRedirect() {
  const { activeRole, isLoaded, isSignedIn } = useTimeoWebAuthContext();
  const { tenants, isLoading } = useTimeoWebTenantContext();

  const homePath = getRoleHomePath(activeRole, tenants.length > 0);

  return {
    homePath,
    activeRole,
    isReady: isLoaded && !isLoading,
    isSignedIn: !!isSignedIn,
    hasTenants: tenants.length > 0,
  };
}
