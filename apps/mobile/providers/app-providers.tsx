import React, { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeoAuthProvider, authClient } from "@timeo/auth";
import { useMyTenants } from "@timeo/api-client";
import type { TenantInfo } from "@timeo/auth";
import { CartProvider } from "./cart";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

function MobileTenantsLoader({ children }: AppProvidersProps) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id ?? null;
  const isSignedIn = !!session.data?.user;

  const { tenants, isLoading } = useMyTenants({
    enabled: isSignedIn,
    userId,
  });

  const mappedTenants = useMemo<TenantInfo[]>(
    () =>
      tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug ?? null,
        role: tenant.role,
      })),
    [tenants],
  );

  useEffect(() => {
    const runtime = globalThis as Record<string, unknown>;
    const getCookie = (authClient as { getCookie?: () => string }).getCookie;

    if (typeof getCookie !== "function") {
      return;
    }

    runtime.__timeoGetAuthCookie = () => {
      try {
        return getCookie();
      } catch {
        return null;
      }
    };

    return () => {
      delete runtime.__timeoGetAuthCookie;
    };
  }, []);

  const tenantsLoading = session.isPending || (isSignedIn && isLoading);

  return (
    <TimeoAuthProvider tenants={mappedTenants} tenantsLoading={tenantsLoading}>
      {children}
    </TimeoAuthProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileTenantsLoader>
        <CartProvider>
          {children}
        </CartProvider>
      </MobileTenantsLoader>
    </QueryClientProvider>
  );
}
