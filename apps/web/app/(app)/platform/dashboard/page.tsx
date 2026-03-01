"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Badge,
} from "@timeo/ui/web";
import { KpiCard } from "@/components/platform/kpi-card";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Plus,
  Activity,
} from "lucide-react";

interface PlatformStats {
  totalTenants: number;
  activeTenants30d: number;
  mrr: number;
  newTenants30d: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetName: string;
  ipAddress: string;
  createdAt: string;
}

interface RecentTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface AuditLogsResponse {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMrr(cents: number) {
  return `RM ${(cents / 100).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function actionLabel(action: string) {
  return action.replace(/\./g, " › ").replace(/_/g, " ");
}

export default function PlatformDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => api.get<PlatformStats>("/api/platform/stats"),
    staleTime: 30_000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["platform", "audit-logs", "recent"],
    queryFn: () =>
      api.get<AuditLogsResponse>("/api/platform/audit-logs?limit=10"),
    staleTime: 15_000,
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ["platform", "tenants", "recent"],
    queryFn: () =>
      api.get<RecentTenant[]>("/api/platform/tenants?limit=5&sort=createdAt&order=desc"),
    staleTime: 30_000,
  });

  const auditEntries = auditData?.items ?? [];
  const recentTenants = tenantsData ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            System overview and key metrics.
          </p>
        </div>
        <Link href="/platform/tenants/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Tenant
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Tenants"
          value={statsLoading ? "" : (stats?.totalTenants ?? 0)}
          icon={Building2}
          loading={statsLoading}
          index={0}
        />
        <KpiCard
          label="Active Tenants (30d)"
          value={statsLoading ? "" : (stats?.activeTenants30d ?? 0)}
          icon={Users}
          loading={statsLoading}
          index={1}
        />
        <KpiCard
          label="MRR"
          value={statsLoading ? "" : formatMrr(stats?.mrr ?? 0)}
          icon={DollarSign}
          loading={statsLoading}
          index={2}
        />
        <KpiCard
          label="New Tenants (30d)"
          value={statsLoading ? "" : (stats?.newTenants30d ?? 0)}
          icon={TrendingUp}
          loading={statsLoading}
          index={3}
        />
      </div>

      {/* Two-column row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Link href="/platform/activity">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : auditEntries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.04] p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">
                        {actionLabel(entry.action)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.actorEmail}
                        {entry.targetName && ` › ${entry.targetName}`}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tenant Signups */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4 text-primary" />
              Recent Signups
            </CardTitle>
            <Link href="/platform/tenants">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentTenants.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No tenants yet.
                </p>
                <Link href="/platform/tenants/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Tenant
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTenants.map((tenant) => (
                  <Link
                    key={tenant.id}
                    href={`/platform/tenants/${tenant.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {tenant.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{tenant.slug}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={planColors[tenant.plan] ?? ""}
                      >
                        {tenant.plan}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={statusColors[tenant.status] ?? ""}
                      >
                        {tenant.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
