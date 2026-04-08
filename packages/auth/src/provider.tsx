import React, { createContext, useContext, useMemo, useState } from "react";
import { authClient } from "./auth-client";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole } from "./types";
import { getPreferredTenant } from "./tenant-selection";
import { normalizeTimeoRole, resolveEffectiveRole } from "./routing";

// ─── Contexts ───────────────────────────────────────────────────────
const TimeoAuthCtx = createContext<TimeoAuthContext | null>(null);
const TenantSwitcherCtx = createContext<TenantSwitcherContext | null>(null);

// ─── Inner Provider ─────────────────────────────────────────────────
function TimeoAuthInner({
  children,
  tenants: externalTenants,
  tenantsLoading,
}: {
  children: React.ReactNode;
  tenants?: TenantInfo[];
  tenantsLoading?: boolean;
}) {
  const session = authClient.useSession();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"platform" | "tenant">("tenant");
  const [viewAsRole, setViewAsRole] = useState<TimeoRole | null>(null);

  const isSignedIn = !!session.data?.user;
  const isLoaded = !session.isPending;

  const tenants = externalTenants ?? [];
  const preferredTenant = getPreferredTenant(tenants, activeTenantId);
  const resolvedTenantId = preferredTenant?.id ?? null;

  const authContext = useMemo<TimeoAuthContext>(() => {
    const user = session.data?.user;
    const timeoUser = user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.image ?? undefined,
        }
      : null;

    const membershipRole = normalizeTimeoRole(preferredTenant?.role);
    const isPlatformAdmin = membershipRole === "platform_admin";
    const activeRole: TimeoRole = resolveEffectiveRole({
      platformRole: isPlatformAdmin ? "platform_admin" : "user",
      membershipRole,
      viewMode,
      viewAsRole,
    });

    return {
      user: timeoUser,
      isLoaded,
      isSignedIn,
      signOut: async () => {
        await authClient.signOut();
      },
      activeTenantId: resolvedTenantId,
      activeRole,
      setActiveTenant: setActiveTenantId,
      isPlatformAdmin,
      viewMode,
      setViewMode,
      viewAsRole,
      setViewAsRole,
    };
  }, [
    session.data,
    isLoaded,
    isSignedIn,
    resolvedTenantId,
    preferredTenant,
    viewAsRole,
    viewMode,
  ]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    return {
      tenants,
      activeTenant: preferredTenant,
      switchTenant: setActiveTenantId,
      isLoading: tenantsLoading ?? false,
    };
  }, [tenants, preferredTenant, tenantsLoading]);

  // Keep selected tenant valid and always prefer elevated roles over customer-only memberships.
  React.useEffect(() => {
    if (resolvedTenantId !== activeTenantId) {
      setActiveTenantId(resolvedTenantId);
    }
  }, [activeTenantId, resolvedTenantId]);

  return (
    <TimeoAuthCtx.Provider value={authContext}>
      <TenantSwitcherCtx.Provider value={tenantSwitcher}>
        {children}
      </TenantSwitcherCtx.Provider>
    </TimeoAuthCtx.Provider>
  );
}

// ─── Main Provider ──────────────────────────────────────────────────
interface TimeoAuthProviderProps {
  children: React.ReactNode;
  /** Tenant list from external data source (e.g., TanStack Query) */
  tenants?: TenantInfo[];
  /** Whether tenant data is still loading */
  tenantsLoading?: boolean;
}

export function TimeoAuthProvider({
  children,
  tenants,
  tenantsLoading,
}: TimeoAuthProviderProps) {
  return (
    <TimeoAuthInner tenants={tenants} tenantsLoading={tenantsLoading}>
      {children}
    </TimeoAuthInner>
  );
}

// ─── Context Accessors ──────────────────────────────────────────────
export function useTimeoAuthContext(): TimeoAuthContext {
  const ctx = useContext(TimeoAuthCtx);
  if (!ctx) throw new Error("useTimeoAuthContext must be used within <TimeoAuthProvider>");
  return ctx;
}

export function useTenantSwitcherContext(): TenantSwitcherContext {
  const ctx = useContext(TenantSwitcherCtx);
  if (!ctx) throw new Error("useTenantSwitcherContext must be used within <TimeoAuthProvider>");
  return ctx;
}
