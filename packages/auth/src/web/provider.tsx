"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { authClient } from "./auth-client";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole, ViewMode } from "../types";
import { getPreferredTenant } from "../tenant-selection";

const ACTIVE_TENANT_STORAGE_KEY = "timeo.activeTenantId";

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
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const isPlatformAdmin = platformRole === "platform_admin";
  // Platform admins start in "platform" mode (C2), can switch to "tenant" mode
  const [viewMode, setViewMode] = useState<ViewMode>(
    isPlatformAdmin ? "platform" : "tenant"
  );

  const isSignedIn = !!session.data?.user;
  const isLoaded = !session.isPending;

  const persistActiveTenantId = React.useCallback((tenantId: string | null) => {
    setActiveTenantId(tenantId);

    if (typeof window === "undefined") return;

    try {
      if (tenantId) {
        window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
      } else {
        window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in private mode; ignore safely.
    }
  }, []);

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

    // In "platform" mode, platform admins get platform_admin role
    // In "tenant" mode, they get their tenant-level role
    const activeRole: TimeoRole =
      isPlatformAdmin && viewMode === "platform"
        ? "platform_admin"
        : preferredTenant?.role ?? "customer";

    return {
      user: timeoUser,
      isLoaded,
      isSignedIn,
      signOut: async () => {
        await authClient.signOut();
      },
      activeTenantId: resolvedTenantId,
      activeRole,
      setActiveTenant: persistActiveTenantId,
      isPlatformAdmin,
      viewMode,
      setViewMode,
    };
  }, [session.data, isLoaded, isSignedIn, preferredTenant, resolvedTenantId, viewMode, isPlatformAdmin]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    return {
      tenants,
      activeTenant: preferredTenant,
      switchTenant: persistActiveTenantId,
      isLoading: tenantsLoading ?? false,
    };
  }, [tenants, preferredTenant, tenantsLoading, persistActiveTenantId]);

  // Keep selected tenant valid and prefer elevated memberships over customer-only profiles.
  React.useEffect(() => {
    if (resolvedTenantId !== activeTenantId) {
      persistActiveTenantId(resolvedTenantId);
    }
  }, [activeTenantId, resolvedTenantId, persistActiveTenantId]);

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
