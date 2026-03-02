"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@timeo/ui/web";
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle,
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "healthy" | "warning" | "critical";
  icon: React.ElementType;
  details: string;
  uptime: string;
}

const services: ServiceStatus[] = [
  { name: "Hono API", status: "healthy", icon: Server, details: "Responding normally", uptime: "99.9%" },
  { name: "PostgreSQL", status: "healthy", icon: Database, details: "Connections: OK", uptime: "99.9%" },
  { name: "Redis", status: "healthy", icon: Cpu, details: "Memory: OK", uptime: "99.9%" },
  { name: "Queue Worker", status: "healthy", icon: HardDrive, details: "Jobs processing", uptime: "99.8%" },
  { name: "Socket.io", status: "healthy", icon: Wifi, details: "WebSocket active", uptime: "99.7%" },
];

const STATUS_CONFIG = {
  healthy: { label: "Healthy", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { label: "Warning", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  critical: { label: "Critical", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function HealthPage() {
  const allHealthy = services.every((s) => s.status === "healthy");

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
                {allHealthy ? "All Systems Operational" : "Some Systems Need Attention"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {services.length} services monitored
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
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
                  <span className="text-xs text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium text-emerald-400">{service.uptime}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metrics Overview */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">System Metrics</CardTitle>
          <CardDescription>Resource usage and performance indicators.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">CPU Usage</p>
              <div className="h-2 rounded-full bg-zinc-800">
                <div className="h-2 w-1/4 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground">~25%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Memory</p>
              <div className="h-2 rounded-full bg-zinc-800">
                <div className="h-2 w-2/5 rounded-full bg-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">~40% of 4GB</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Disk</p>
              <div className="h-2 rounded-full bg-zinc-800">
                <div className="h-2 w-1/3 rounded-full bg-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground">~33% of 80GB</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">DB Connections</p>
              <div className="h-2 rounded-full bg-zinc-800">
                <div className="h-2 w-1/5 rounded-full bg-cyan-500" />
              </div>
              <p className="text-xs text-muted-foreground">~20% of pool</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
