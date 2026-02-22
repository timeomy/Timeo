"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { ConvexReactClient, useQuery } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./auth-client";
import { api } from "@timeo/api";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole } from "../types";

// ─── Contexts ───────────────────────────────────────────────────────
const TimeoWebAuthCtx = createContext<TimeoAuthContext | null>(null);
const TimeoWebTenantCtx = createContext<TenantSwitcherContext | null>(null);

// ─── Inner Provider ─────────────────────────────────────────────────
function TimeoWebAuthInner({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  const isSignedIn = !!session.data?.user;
  const isLoaded = !session.isPending;

  // Query Convex for user's tenants
  const convexTenants = useQuery(api.tenants.getMyTenants, isSignedIn ? {} : "skip");

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

    const activeTenant = convexTenants?.find(
      (t) => t && t._id === activeTenantId
    );
    const activeRole: TimeoRole = (activeTenant?.role as TimeoRole) ?? "customer";

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
  }, [session.data, isLoaded, isSignedIn, activeTenantId, convexTenants]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    const tenants: TenantInfo[] = (convexTenants ?? [])
      .filter((t): t is NonNullable<typeof t> => t != null)
      .map((t) => ({
        id: t._id,
        name: t.name,
        slug: t.slug,
        role: (t.role as TimeoRole) ?? "customer",
      }));

    const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;

    return {
      tenants,
      activeTenant,
      switchTenant: setActiveTenantId,
      isLoading: convexTenants === undefined,
    };
  }, [convexTenants, activeTenantId]);

  // Auto-select first tenant if none selected
  React.useEffect(() => {
    if (!activeTenantId && convexTenants && convexTenants.length > 0) {
      const first = convexTenants[0];
      if (first) setActiveTenantId(first._id);
    }
  }, [activeTenantId, convexTenants]);

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
  convexUrl: string;
}

export function TimeoWebAuthProvider({ children, convexUrl }: TimeoWebAuthProviderProps) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <TimeoWebAuthInner>{children}</TimeoWebAuthInner>
    </ConvexBetterAuthProvider>
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
