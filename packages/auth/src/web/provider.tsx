"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { authClient } from "./auth-client";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole, ViewMode } from "../types";
import { getPreferredTenant } from "../tenant-selection";
import { normalizeTimeoRole, resolveEffectiveRole } from "../routing";

const ACTIVE_TENANT_STORAGE_KEY = "timeo.activeTenantId";
const VIEW_MODE_STORAGE_KEY = "timeo.viewMode";
const VIEW_ROLE_STORAGE_KEY = "timeo.viewAsRole";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (!value) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

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
  const isPlatformAdmin = platformRole === "platform_admin";
  const hasResolvedPlatformRole =
    platformRole === "platform_admin" || platformRole === "user";

  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    return readStorage(ACTIVE_TENANT_STORAGE_KEY) ?? readCookie(ACTIVE_TENANT_STORAGE_KEY);
  });

  const [initialViewModeState] = useState<{ value: ViewMode; hasPersisted: boolean }>(() => {
    const stored = readStorage(VIEW_MODE_STORAGE_KEY) ?? readCookie(VIEW_MODE_STORAGE_KEY);
    if (stored === "platform" || stored === "tenant") {
      return { value: stored, hasPersisted: true };
    }

    return {
      value: isPlatformAdmin ? "platform" : "tenant",
      hasPersisted: false,
    };
  });

  const hasPersistedViewModeRef = React.useRef(initialViewModeState.hasPersisted);

  // Platform admins start in "platform" mode (C2), can switch to "tenant" mode
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewModeState.value);

  const [viewAsRole, setViewAsRole] = useState<TimeoRole | null>(() => {
    const stored = readStorage(VIEW_ROLE_STORAGE_KEY) ?? readCookie(VIEW_ROLE_STORAGE_KEY);
    if (!stored) return null;
    return normalizeTimeoRole(stored);
  });

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
    const activeRole = resolveEffectiveRole({
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
        setActiveTenantId(null);
        setViewAsRole(null);
        setViewMode("tenant");
        hasPersistedViewModeRef.current = false;
        writeCookie(ACTIVE_TENANT_STORAGE_KEY, null);
        writeCookie(VIEW_MODE_STORAGE_KEY, null);
        writeCookie(VIEW_ROLE_STORAGE_KEY, null);
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
    preferredTenant,
    resolvedTenantId,
    viewMode,
    isPlatformAdmin,
    viewAsRole,
  ]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    return {
      tenants,
      activeTenant: preferredTenant,
      switchTenant: setActiveTenantId,
      isLoading: tenantsLoading ?? false,
    };
  }, [tenants, preferredTenant, tenantsLoading]);

  // Keep selected tenant valid and prefer elevated memberships over customer-only profiles.
  React.useEffect(() => {
    if (resolvedTenantId !== activeTenantId) {
      setActiveTenantId(resolvedTenantId);
    }
  }, [activeTenantId, resolvedTenantId]);

  React.useEffect(() => {
    if (!hasResolvedPlatformRole) return;

    if (!isPlatformAdmin && viewMode !== "tenant") {
      setViewMode("tenant");
      return;
    }

    if (isPlatformAdmin && !hasPersistedViewModeRef.current && viewMode !== "platform") {
      setViewMode("platform");
    }
  }, [hasResolvedPlatformRole, isPlatformAdmin, viewMode]);

  React.useEffect(() => {
    if (!isSignedIn && viewAsRole) {
      setViewAsRole(null);
      return;
    }

    if (!preferredTenant) {
      if (viewAsRole) setViewAsRole(null);
      return;
    }

    if (!viewAsRole) return;

    const membershipRole = normalizeTimeoRole(preferredTenant.role);
    const effectiveRole = resolveEffectiveRole({
      platformRole: isPlatformAdmin ? "platform_admin" : "user",
      membershipRole,
      viewMode,
      viewAsRole,
    });

    if (effectiveRole !== viewAsRole && !(isPlatformAdmin && viewMode !== "tenant")) {
      setViewAsRole(null);
    }
  }, [isPlatformAdmin, isSignedIn, preferredTenant, viewAsRole, viewMode]);

  React.useEffect(() => {
    try {
      if (activeTenantId) {
        window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, activeTenantId);
      } else {
        window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in private mode; ignore safely.
    }

    writeCookie(ACTIVE_TENANT_STORAGE_KEY, activeTenantId);
  }, [activeTenantId]);

  React.useEffect(() => {
    if (!hasResolvedPlatformRole) return;

    hasPersistedViewModeRef.current = true;

    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // localStorage may be unavailable in private mode; ignore safely.
    }

    writeCookie(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [hasResolvedPlatformRole, viewMode]);

  React.useEffect(() => {
    try {
      if (viewAsRole) {
        window.localStorage.setItem(VIEW_ROLE_STORAGE_KEY, viewAsRole);
      } else {
        window.localStorage.removeItem(VIEW_ROLE_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in private mode; ignore safely.
    }

    writeCookie(VIEW_ROLE_STORAGE_KEY, viewAsRole);
  }, [viewAsRole]);

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
