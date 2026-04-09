"use client";

import {
  useEffectiveFeatureFlags,
  useUpdateTenantFeatureFlagOverride,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@timeo/ui/web";

const sourceBadgeClass: Record<string, string> = {
  override: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  template: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  global: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

export default function TenantFeatureFlagsPage() {
  const { tenantId } = useTenantId();
  const { data, isLoading } = useEffectiveFeatureFlags(tenantId);
  const updateOverride = useUpdateTenantFeatureFlagOverride(tenantId);

  async function toggleFlag(key: string, currentValue: boolean) {
    try {
      await updateOverride.mutateAsync({
        key,
        enabled: !currentValue,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update feature flag");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-muted-foreground">
          View effective feature flags and their source.
        </p>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Effective Flags</CardTitle>
          <CardDescription>
            Resolution order: tenant override → template default → global default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading feature flags...</p>
          ) : !data || data.details.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feature flags available.</p>
          ) : (
            <div className="space-y-2">
              {data.details.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between rounded border border-white/[0.08] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{flag.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{flag.key}</code>
                      {flag.description ? ` · ${flag.description}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={sourceBadgeClass[flag.source] ?? sourceBadgeClass.global}
                      >
                        {flag.source}
                      </Badge>
                      <Badge variant="outline">
                        {flag.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={updateOverride.isPending}
                    />
                    Toggle
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
