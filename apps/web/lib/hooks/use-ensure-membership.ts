"use client";

import { useEffect, useRef } from "react";
import { api } from "@timeo/api-client";

/**
 * Ensures the authenticated user has a tenantMembership for the given tenant.
 * Creates a "customer" membership by calling POST /api/tenants/join if none exists.
 */
export function useEnsureMembership(tenantId: string | null | undefined) {
  const hasRun = useRef<string | null>(null);

  useEffect(() => {
    if (tenantId && hasRun.current !== tenantId) {
      hasRun.current = tenantId;
      // Silently ensure membership — server upserts if missing
      api
        .post(`/api/tenants/${tenantId}/ensure-membership`, {})
        .catch((err: unknown) => {
          console.warn("[useEnsureMembership]", err);
          hasRun.current = null; // allow retry
        });
    }
  }, [tenantId]);
}
