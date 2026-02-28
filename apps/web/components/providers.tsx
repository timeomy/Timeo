"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeoWebAuthProvider } from "@timeo/auth/web";
import { TimeoWebAnalyticsProvider } from "@timeo/analytics/web";
import { useMyTenants } from "@timeo/api-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/** Loads tenant list and wires it into the auth provider. Must be inside QueryClientProvider. */
function TenantsLoader({ children }: { children: ReactNode }) {
  const { data: tenants, isLoading } = useMyTenants();
  return (
    <TimeoWebAuthProvider tenants={tenants ?? []} tenantsLoading={isLoading}>
      {children}
    </TimeoWebAuthProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TimeoWebAnalyticsProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""}
      host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
    >
      <QueryClientProvider client={queryClient}>
        <TenantsLoader>{children}</TenantsLoader>
      </QueryClientProvider>
    </TimeoWebAnalyticsProvider>
  );
}
