"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import { cn } from "@timeo/ui/web";

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  db: "ok" | "degraded" | "error";
  redis: "ok" | "degraded" | "error";
  queues: "ok" | "degraded" | "error";
}

type IndicatorState = "green" | "yellow" | "red";

function toIndicatorState(
  value: "ok" | "degraded" | "error" | undefined,
): IndicatorState {
  if (value === "ok") return "green";
  if (value === "degraded") return "yellow";
  return "red";
}

function StatusDot({
  state,
  label,
}: {
  state: IndicatorState;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          state === "green" && "bg-emerald-400",
          state === "yellow" && "bg-yellow-400",
          state === "red" && "bg-red-400 animate-pulse",
        )}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function SystemHealthBar() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform", "health"],
    queryFn: () => api.get<HealthStatus>("/api/platform/health"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const apiState: IndicatorState = isError
    ? "red"
    : isLoading
      ? "yellow"
      : toIndicatorState(data?.status);

  const dbState: IndicatorState = isLoading
    ? "yellow"
    : toIndicatorState(data?.db);

  const redisState: IndicatorState = isLoading
    ? "yellow"
    : toIndicatorState(data?.redis);

  const queuesState: IndicatorState = isLoading
    ? "yellow"
    : toIndicatorState(data?.queues);

  const allOk =
    apiState === "green" &&
    dbState === "green" &&
    redisState === "green" &&
    queuesState === "green";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2",
        allOk
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-yellow-500/20 bg-yellow-500/5",
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">
        System
      </span>
      <div className="flex items-center gap-4">
        <StatusDot state={apiState} label="API" />
        <StatusDot state={dbState} label="DB" />
        <StatusDot state={redisState} label="Redis" />
        <StatusDot state={queuesState} label="Queue" />
      </div>
    </div>
  );
}
