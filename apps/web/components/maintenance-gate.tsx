"use client";

import { useQuery } from "@tanstack/react-query";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useMaintenanceMode() {
  return useQuery({
    queryKey: ["platformConfig", "general"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API}/api/platform/config/general`);
        const json = (await res.json()) as {
          success: boolean;
          data: Record<string, unknown>;
        };
        return json.success ? json.data : {};
      } catch {
        return {};
      }
    },
    staleTime: 60_000,
  });
}

export function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: config } = useMaintenanceMode();

  if (config?.maintenance_mode === true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground">
            {(config?.maintenance_message as string) ??
              "We'll be back shortly."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
