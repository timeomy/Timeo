import React, { createContext, useContext, useMemo, useState } from "react";
import { authClient } from "./auth-client";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole } from "./types";

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

  const isSignedIn = !!session.data?.user;
  const isLoaded = !session.isPending;

  const tenants = externalTenants ?? [];

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

    const activeTenant = tenants.find((t) => t.id === activeTenantId);
    const activeRole: TimeoRole = activeTenant?.role ?? "customer";

    return {
      user: timeoUser,
      isLoaded,
      isSignedIn,
      signOut: async () => {
        await authClient.signOut();
      },
      activeTenantId,
      activeRole,
      setActiveTenant: setActiveTenantId,
    };
  }, [session.data, isLoaded, isSignedIn, activeTenantId, tenants]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;

    return {
      tenants,
      activeTenant,
      switchTenant: setActiveTenantId,
      isLoading: tenantsLoading ?? false,
    };
  }, [tenants, activeTenantId, tenantsLoading]);

  // Auto-select first tenant if none selected
  React.useEffect(() => {
    if (!activeTenantId && tenants.length > 0) {
      const first = tenants[0];
      if (first) setActiveTenantId(first.id);
    }
  }, [activeTenantId, tenants]);

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
