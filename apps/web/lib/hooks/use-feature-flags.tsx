"use client";

import { createContext, useContext } from "react";
import { useTenantFeatureFlags } from "@timeo/api-client";
import { useTimeoWebTenantContext } from "@timeo/auth/web";

type Flags = Record<string, boolean>;

const FlagsContext = createContext<Flags>({});

export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeTenant } = useTimeoWebTenantContext();
  const { data: flags } = useTenantFeatureFlags(activeTenant?.id);
  return (
    <FlagsContext.Provider value={flags ?? {}}>{children}</FlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FlagsContext);
}

export function useFlag(key: string, defaultValue = false) {
  const flags = useFeatureFlags();
  return flags[key] ?? defaultValue;
}
