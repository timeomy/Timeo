"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@timeo/api-client";
import {
  getRoleHomePath,
  normalizeTimeoRole,
  useTimeoWebAuthContext,
  useTimeoWebTenantContext,
} from "@timeo/auth/web";

type TenantRoleTarget = "admin" | "staff" | "coach" | "customer";

export function useViewAs() {
  const router = useRouter();
  const {
    isPlatformAdmin,
    setActiveTenant,
    setViewMode,
    setViewAsRole,
    activeTenantId,
    viewMode,
    viewAsRole,
  } = useTimeoWebAuthContext();
  const { tenants, activeTenant } = useTimeoWebTenantContext();

  const adminMemberships = useMemo(
    () =>
      tenants.filter((tenant) => normalizeTimeoRole(tenant.role) === "admin"),
    [tenants],
  );

  const canUseSwitcher =
    isPlatformAdmin || (adminMemberships.length > 0 && tenants.length > 1);

  const switchToPlatform = useCallback(async (): Promise<void> => {
    if (!isPlatformAdmin) return;

    setViewAsRole(null);
    setViewMode("platform");
    await api
      .post("/api/admin/view-as", { mode: "platform" })
      .catch((): void => undefined);
    router.push("/admin");
  }, [isPlatformAdmin, router, setViewAsRole, setViewMode]);

  const switchTenantRole = useCallback(
    async (tenantId: string, role: TenantRoleTarget): Promise<void> => {
      setActiveTenant(tenantId);
      setViewMode("tenant");
      setViewAsRole(role);

      await api
        .post("/api/admin/view-as", {
          mode: "tenant",
          tenantId,
          role,
        })
        .catch((): void => undefined);

      router.push(getRoleHomePath(role));
    },
    [router, setActiveTenant, setViewAsRole, setViewMode],
  );

  return {
    isPlatformAdmin,
    canUseSwitcher,
    tenants,
    activeTenant,
    activeTenantId,
    viewMode,
    viewAsRole,
    switchToPlatform,
    switchTenantRole,
  };
}
