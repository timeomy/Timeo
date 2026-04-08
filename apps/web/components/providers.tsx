"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient, TimeoWebAuthProvider } from "@timeo/auth/web";
import { TimeoWebAnalyticsProvider } from "@timeo/analytics/web";
import { useMyTenants } from "@timeo/api-client";
import { LanguageProvider } from "@/language-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/** Loads tenant list and wires it into the auth provider. Must be inside QueryClientProvider. */
function TenantsLoader({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id ?? null;
  const isSignedIn = !!session.data?.user;
  const { tenants, platformRole, isLoading } = useMyTenants({
    enabled: isSignedIn,
    userId,
  });

  const tenantsLoading = session.isPending || (isSignedIn && isLoading);

  return (
    <TimeoWebAuthProvider tenants={tenants} tenantsLoading={tenantsLoading} platformRole={platformRole}>
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
        <LanguageProvider>
          <TenantsLoader>{children}</TenantsLoader>
        </LanguageProvider>
      </QueryClientProvider>
    </TimeoWebAnalyticsProvider>
  );
}
