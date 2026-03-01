import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeoAuthProvider } from "@timeo/auth";

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

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TimeoAuthProvider>
        {children}
      </TimeoAuthProvider>
    </QueryClientProvider>
  );
}
