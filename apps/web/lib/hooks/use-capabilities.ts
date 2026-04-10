"use client";

import { useMemo } from "react";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import {
  getCapabilitiesForRole,
  hasCapability,
  type Capability,
} from "@timeo/shared";

function useResolvedRole(): string {
  const { activeRole, isPlatformAdmin } = useTimeoWebAuthContext();
  return isPlatformAdmin ? "platform_admin" : activeRole;
}

export function useCapabilities(): Capability[] {
  const role = useResolvedRole();

  return useMemo(() => getCapabilitiesForRole(role), [role]);
}

export function useHasCapability(capability: Capability | string): boolean {
  const role = useResolvedRole();

  return useMemo(() => hasCapability(role, capability), [role, capability]);
}
