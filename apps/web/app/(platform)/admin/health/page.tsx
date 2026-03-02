"use client";

import { usePlatformHealth } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import {
  Activity,
  Server,
  Database,
  Cpu,
  CheckCircle,
} from "lucide-react";

type ServiceStatusLevel = "healthy" | "warning" | "critical";

interface DbCheck {
  status: string;
  latencyMs?: number;
  error?: string;
}

interface ProcessCheck {
  uptime_seconds: number;
  memory: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
  node_version: string;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { label: "Warning", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  critical: { label: "Critical", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function checkToStatus(check: DbCheck | undefined): ServiceStatusLevel {
  if (!check) return "critical";
  return check.status === "healthy" ? "healthy" : "critical";
}

export default function HealthPage() {
  const { data: health, isLoading, isError, error } = usePlatformHealth();

  const checks = health?.checks as {
    database?: DbCheck;
    redis?: DbCheck;
    process?: ProcessCheck;
  } | undefined;

  const dbCheck = checks?.database;
  const redisCheck = checks?.redis;
  const processCheck = checks?.process;

  const services = isLoading
    ? []
    : [
        {
          name: "Hono API",
          status: "healthy" as ServiceStatusLevel,
          icon: Server,
          details: "Responding normally",
          metric: processCheck ? `Up ${formatUptime(processCheck.uptime_seconds)}` : "—",
        },
        {
          name: "PostgreSQL",
          status: checkToStatus(dbCheck),
          icon: Database,
          details: dbCheck?.status === "healthy"
            ? `Latency: ${dbCheck.latencyMs}ms`
            : dbCheck?.error ?? "Unreachable",
          metric: dbCheck?.latencyMs != null ? `${dbCheck.latencyMs}ms` : "—",
        },
        {
          name: "Redis",
          status: checkToStatus(redisCheck),
          icon: Cpu,
          details: redisCheck?.status === "healthy"
            ? `Latency: ${redisCheck.latencyMs}ms`
            : redisCheck?.error ?? "Unreachable",
          metric: redisCheck?.latencyMs != null ? `${redisCheck.latencyMs}ms` : "—",
        },
      ];

  const allHealthy = !isLoading && !isError && services.every((s) => s.status === "healthy");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="mt-1 text-muted-foreground">
          Infrastructure monitoring and service status.
        </p>
      </div>

      {/* Overall Status */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
              </>
            ) : (
              <>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  allHealthy ? "bg-emerald-500/20" : "bg-yellow-500/20"
                }`}>
                  {allHealthy ? (
                    <CheckCircle className="h-7 w-7 text-emerald-400" />
                  ) : (
                    <Activity className="h-7 w-7 text-yellow-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {isError
                      ? "Health Check Failed"
                      : allHealthy
                        ? "All Systems Operational"
                        : "Some Systems Need Attention"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isError
                      ? (error as Error)?.message ?? "Could not reach API"
                      : `${services.length} services monitored`}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass border-white/[0.08]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="mt-1 h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          services.map((service) => {
            const statusConfig = STATUS_CONFIG[service.status];
            const ServiceIcon = service.icon;

            return (
              <Card key={service.name} className="glass border-white/[0.08]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ServiceIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.details}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-xs text-muted-foreground">
                      {service.name === "Hono API" ? "Uptime" : "Latency"}
                    </span>
                    <span className={`text-sm font-medium ${
                      service.status === "healthy" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {service.metric}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Memory & Process Metrics */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">System Metrics</CardTitle>
          <CardDescription>Resource usage and performance indicators.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Heap Memory</p>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: processCheck
                        ? `${Math.min(100, Math.round((processCheck.memory.heap_used_mb / processCheck.memory.heap_total_mb) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {processCheck
                    ? `${processCheck.memory.heap_used_mb}MB / ${processCheck.memory.heap_total_mb}MB`
                    : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RSS Memory</p>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-purple-500"
                    style={{
                      width: processCheck
                        ? `${Math.min(100, Math.round((processCheck.memory.rss_mb / 512) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {processCheck ? `${processCheck.memory.rss_mb}MB` : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">DB Latency</p>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{
                      width: dbCheck?.latencyMs != null
                        ? `${Math.min(100, Math.round((dbCheck.latencyMs / 100) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {dbCheck?.latencyMs != null ? `${dbCheck.latencyMs}ms` : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Redis Latency</p>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500"
                    style={{
                      width: redisCheck?.latencyMs != null
                        ? `${Math.min(100, Math.round((redisCheck.latencyMs / 100) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {redisCheck?.latencyMs != null ? `${redisCheck.latencyMs}ms` : "—"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
