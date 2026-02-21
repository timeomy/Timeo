"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";

/**
 * Ensures the authenticated user has a tenantMembership for the given tenant.
 * Creates a "customer" membership if none exists.
 */
export function useEnsureMembership(tenantId: any) {
  const ensureMembership = useMutation(api.auth.ensureMembership);
  const hasRun = useRef<string | null>(null);

  useEffect(() => {
    if (tenantId && hasRun.current !== tenantId) {
      hasRun.current = tenantId;
      ensureMembership({ tenantId }).catch((err) => {
        console.warn("[useEnsureMembership]", err);
        hasRun.current = null; // allow retry
      });
    }
  }, [tenantId, ensureMembership]);
}
