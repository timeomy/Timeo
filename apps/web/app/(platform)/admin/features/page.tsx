"use client";

import { usePlatformFlags, useUpdatePlatformFlag } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import { Zap } from "lucide-react";

function Toggle({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function FeatureFlagsPage() {
  const { data: flags, isLoading } = usePlatformFlags();
  const updateFlag = useUpdatePlatformFlag();

  function handleToggle(id: string, currentEnabled: boolean) {
    updateFlag.mutate({ id, default_enabled: !currentEnabled });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-muted-foreground">
          Control what features are available globally and per-tenant.
        </p>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Global Feature Flags
          </CardTitle>
          <CardDescription>
            Toggle features on or off across the entire platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-11" />
                </div>
              ))}
            </div>
          ) : !flags || flags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No feature flags</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Feature flags will be managed here once they are configured.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{flag.name}</p>
                      <Badge variant="outline" className="font-mono text-xs">
                        {flag.key}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          flag.defaultEnabled
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }
                      >
                        {flag.defaultEnabled ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    {flag.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {flag.description}
                      </p>
                    )}
                    {flag.phase && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Phase: {flag.phase}
                      </p>
                    )}
                    {flag.overrides.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {flag.overrides.length} tenant override{flag.overrides.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <Toggle
                    checked={flag.defaultEnabled}
                    onCheckedChange={() => handleToggle(flag.id, flag.defaultEnabled)}
                    disabled={updateFlag.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
