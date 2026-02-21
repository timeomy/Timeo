"use client";

import React, { createContext, useContext, useMemo } from "react";
import { ClerkProvider, useAuth, useUser, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { api } from "@timeo/api";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo, TimeoRole } from "../types";
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

  // Fallback: query Convex tenants when user has no active Clerk org
  const hasClerkOrg = !!organization;
  const hasAnyClerkMemberships = (userMemberships.data?.length ?? 0) > 0;
  const convexTenants = useQuery(
    api.tenants.getMyTenants,
    (!hasClerkOrg || !hasAnyClerkMemberships) && isSignedIn ? {} : "skip"
  );

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

    // Determine role: Clerk org role takes priority, fallback to Convex membership role
    let activeRole: TimeoRole = "customer";
    if (organization) {
      const membership = userMemberships.data?.find(
        (m: { organization: { id: string }; role: string }) => m.organization.id === organization.id,
      );
      activeRole = clerkRoleToTimeo(membership?.role);
    } else if (convexTenants && convexTenants.length > 0) {
      // Legacy user without Clerk org — use Convex role
      activeRole = (convexTenants[0]!.role as TimeoRole) ?? "customer";
    }

    return {
      user: timeoUser,
      isLoaded: authLoaded,
      isSignedIn: !!isSignedIn,
      signOut: async () => { await signOut(); },
      activeOrg,
      activeTenantId: organization?.id ?? null,
      activeRole,
    };
  }, [user, organization, authLoaded, isSignedIn, signOut, userMemberships.data, convexTenants]);

  const tenantSwitcher = useMemo<TenantSwitcherContext>(() => {
    const clerkTenants: TenantInfo[] =
      userMemberships.data?.map(
        (m: { organization: { id: string; name: string; slug: string | null }; role: string }) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: clerkRoleToTimeo(m.role),
        }),
      ) ?? [];

    // Fallback: use Convex tenants for legacy users without Clerk orgs
    const tenants: TenantInfo[] =
      clerkTenants.length > 0
        ? clerkTenants
        : (convexTenants ?? [])
            .filter((t): t is NonNullable<typeof t> => t != null)
            .map((t) => ({
              id: t._id,
              name: t.name,
              slug: t.slug,
              role: (t.role as TimeoRole) ?? "customer",
            }));

    const activeTenant =
      tenants.find((t) => t.id === organization?.id) ??
      (clerkTenants.length === 0 && tenants.length > 0 ? tenants[0]! : null);

    return {
      tenants,
      activeTenant,
      switchTenant: async (orgId: string) => {
        await setActive?.({ organization: orgId });
      },
      isLoading: userMemberships.isLoading && !convexTenants,
    };
  }, [userMemberships.data, userMemberships.isLoading, organization?.id, setActive, convexTenants]);

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
