"use client";

import Link from "next/link";
import {
  usePlatformAnalyticsOverview,
  usePlatformTenants,
  usePlatformAuditLog,
  usePlatformHealth,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import {
  Building2,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

function KPICard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-24" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-glow">{value}</p>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthIndicator({ label, status }: { label: string; status: "healthy" | "warning" | "critical" }) {
  const config = {
    healthy: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/20" },
    critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
  }[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg}`}>
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs ${config.color}`}>{status}</p>
      </div>
    </div>
  );
}

export default function CommandDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = usePlatformAnalyticsOverview();
  const { data: tenants, isLoading: tenantsLoading } = usePlatformTenants();
  const { data: logsData, isLoading: logsLoading } = usePlatformAuditLog({ limit: 5 });
  const { data: health } = usePlatformHealth();

  const loading = overviewLoading || tenantsLoading;
  const recentLogs = logsData?.items ?? [];

  const checks = health?.checks as {
    database?: { status: string };
    redis?: { status: string };
  } | undefined;

  function serviceStatus(check?: { status: string }): "healthy" | "warning" | "critical" {
    if (!health) return "warning";
    if (!check) return "critical";
    return check.status === "healthy" ? "healthy" : "critical";
  }

  // API is healthy if the health endpoint responded at all
  const apiStatus: "healthy" | "critical" = health ? "healthy" : "critical";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Live overview of the Timeo platform.
        </p>
      </div>

      {/* System Health Bar */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6">
            <HealthIndicator label="API" status={apiStatus} />
            <HealthIndicator label="PostgreSQL" status={serviceStatus(checks?.database)} />
            <HealthIndicator label="Redis" status={serviceStatus(checks?.redis)} />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Tenants"
          value={overview?.totalTenants ?? tenants?.length ?? 0}
          icon={Building2}
          description="Registered businesses"
          loading={loading}
        />
        <KPICard
          title="Total Users"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          description="All platform users"
          loading={overviewLoading}
        />
        <KPICard
          title="Active (24h)"
          value={overview?.activeMembers24h ?? 0}
          icon={DollarSign}
          description="Active members today"
          loading={overviewLoading}
        />
        <KPICard
          title="Tenants"
          value={tenants?.length ?? 0}
          icon={ShoppingCart}
          description={`${tenants?.filter((t) => t.status === "active").length ?? 0} active`}
          loading={tenantsLoading}
        />
      </div>

      {/* Recent Activity */}
      <Card className="glass border-white/[0.08]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Link
            href="/admin/activity"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2"
                >
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {log.action}
                  </Badge>
                  <span className="truncate text-sm text-muted-foreground">
                    {log.resourceType} &mdash; {log.resourceId ?? "n/a"}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/tenants/new"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Onboard Tenant</p>
                <p className="text-xs text-muted-foreground">Register a new business</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              href="/admin/communications"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Broadcast Announcement</p>
                <p className="text-xs text-muted-foreground">Notify all tenants</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              href="/admin/health"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">System Health</p>
                <p className="text-xs text-muted-foreground">Check service status</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
