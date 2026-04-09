"use client";

import { useTenantUiConfig, type UiConfigScope } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";

export function useResolvedConfig(scope: UiConfigScope) {
  const { tenantId } = useTenantId();
  return useTenantUiConfig(tenantId, scope);
}

export function useResolvedMemberConfig() {
  return useResolvedConfig("member");
}

export function useResolvedAdminConfig() {
  return useResolvedConfig("admin");
}
