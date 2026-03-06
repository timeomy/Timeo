"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { authClient } from "./auth-client";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole } from "../types";

// ─── Contexts ───────────────────────────────────────────────────────
const TimeoWebAuthCtx = createContext<TimeoAuthContext | null>(null);
const TimeoWebTenantCtx = createContext<TenantSwitcherContext | null>(null);

// ─── Inner Provider ─────────────────────────────────────────────────
function TimeoWebAuthInner({
  children,
  tenants: externalTenants,
  tenantsLoading,
  platformRole,
}: {
  children: React.ReactNode;
  tenants?: TenantInfo[];
  tenantsLoading?: boolean;
  /** Platform-level role from users table ("user" | "platform_admin") */
  platformRole?: string;
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
    // Platform admin role takes precedence over tenant-level roles
    const activeRole: TimeoRole =
      platformRole === "platform_admin"
        ? "platform_admin"
        : activeTenant?.role ?? "customer";

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
  }, [session.data, isLoaded, isSignedIn, activeTenantId, tenants, platformRole]);

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
    <TimeoWebAuthCtx.Provider value={authContext}>
      <TimeoWebTenantCtx.Provider value={tenantSwitcher}>
        {children}
      </TimeoWebTenantCtx.Provider>
    </TimeoWebAuthCtx.Provider>
  );
}

// ─── Main Web Provider ──────────────────────────────────────────────
interface TimeoWebAuthProviderProps {
  children: React.ReactNode;
  /** Tenant list from external data source (e.g., TanStack Query) */
  tenants?: TenantInfo[];
  /** Whether tenant data is still loading */
  tenantsLoading?: boolean;
  /** Platform-level role from users table ("user" | "platform_admin") */
  platformRole?: string;
}

export function TimeoWebAuthProvider({
  children,
  tenants,
  tenantsLoading,
  platformRole,
}: TimeoWebAuthProviderProps) {
  return (
    <TimeoWebAuthInner tenants={tenants} tenantsLoading={tenantsLoading} platformRole={platformRole}>
      {children}
    </TimeoWebAuthInner>
  );
}

// ─── Context Accessors ──────────────────────────────────────────────
export function useTimeoWebAuthContext(): TimeoAuthContext {
  const ctx = useContext(TimeoWebAuthCtx);
  if (!ctx) throw new Error("useTimeoWebAuthContext must be used within <TimeoWebAuthProvider>");
  return ctx;
}

export function useTimeoWebTenantContext(): TenantSwitcherContext {
  const ctx = useContext(TimeoWebTenantCtx);
  if (!ctx) throw new Error("useTimeoWebTenantContext must be used within <TimeoWebAuthProvider>");
  return ctx;
}
