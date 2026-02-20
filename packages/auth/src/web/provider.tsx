"use client";

import React, { createContext, useContext, useMemo } from "react";
import { ClerkProvider, useAuth, useUser, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo } from "../types";
import { clerkRoleToTimeo } from "../types";

// ─── Contexts ───────────────────────────────────────────────────────
const TimeoWebAuthCtx = createContext<TimeoAuthContext | null>(null);
const TimeoWebTenantCtx = createContext<TenantSwitcherContext | null>(null);

// ─── Inner Provider ─────────────────────────────────────────────────
function TimeoWebAuthInner({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const authContext = useMemo<TimeoAuthContext>(() => {
    const timeoUser = user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        }
      : null;

    const activeOrg = organization
      ? { id: organization.id, name: organization.name, slug: organization.slug }
      : null;

    const membership = organization
      ? userMemberships.data?.find(
          (m: { organization: { id: string }; role: string }) => m.organization.id === organization.id,
        )
      : undefined;
    const activeRole = clerkRoleToTimeo(membership?.role);

    return {
      user: timeoUser,
      isLoaded: authLoaded,
      isSignedIn: !!isSignedIn,
      signOut: async () => { await signOut(); },
      activeOrg,
      activeTenantId: organization?.id ?? null,
      activeRole,
    };
  }, [user, organization, authLoaded, isSignedIn, signOut, userMemberships.data]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    const tenants: TenantInfo[] =
      userMemberships.data?.map(
        (m: { organization: { id: string; name: string; slug: string | null }; role: string }) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: clerkRoleToTimeo(m.role),
        }),
      ) ?? [];

    const activeTenant = tenants.find((t) => t.id === organization?.id) ?? null;

    return {
      tenants,
      activeTenant,
      switchTenant: async (orgId: string) => {
        await setActive?.({ organization: orgId });
      },
      isLoading: userMemberships.isLoading,
    };
  }, [userMemberships.data, userMemberships.isLoading, organization?.id, setActive]);

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
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TimeoWebAuthInner>{children}</TimeoWebAuthInner>
      </ConvexProviderWithClerk>
    </ClerkProvider>
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
