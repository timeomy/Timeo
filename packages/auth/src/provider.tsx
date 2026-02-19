import React, { createContext, useContext, useMemo } from "react";
import { ClerkProvider, useAuth, useUser, useOrganization, useOrganizationList } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import type { TimeoAuthContext, TenantSwitcherContext, TenantInfo } from "./types";
import { clerkRoleToTimeo } from "./types";

// ─── Secure Token Cache (Expo) ──────────────────────────────────────
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — token will be refetched
    }
  },
};

// ─── Contexts ───────────────────────────────────────────────────────
const TimeoAuthCtx = createContext<TimeoAuthContext | null>(null);
const TenantSwitcherCtx = createContext<TenantSwitcherContext | null>(null);

// ─── Inner Provider (needs to be inside ClerkProvider) ──────────────
function TimeoAuthInner({ children }: { children: React.ReactNode }) {
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

    const membership = userMemberships.data?.find((m) => m.organization.id === organization?.id);
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
      userMemberships.data?.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: clerkRoleToTimeo(m.role),
      })) ?? [];

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
  publishableKey: string;
  convexUrl: string;
}

export function TimeoAuthProvider({ children, publishableKey, convexUrl }: TimeoAuthProviderProps) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TimeoAuthInner>{children}</TimeoAuthInner>
      </ConvexProviderWithClerk>
    </ClerkProvider>
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
