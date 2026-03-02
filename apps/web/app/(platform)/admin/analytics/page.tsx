"use client";

import {
  usePlatformAnalyticsOverview,
  usePlatformTenantGrowth,
  usePlatformTenants,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  BarChart,
} from "@timeo/ui/web";
import { BarChart3, TrendingUp, Users } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{value}</p>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = usePlatformAnalyticsOverview();
  const { data: growth, isLoading: growthLoading } = usePlatformTenantGrowth(30);
  const { data: tenants, isLoading: tenantsLoading } = usePlatformTenants();

  const growthChartData = (growth ?? []).map((g) => ({
    label: new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: g.count,
  }));

  const topTenants = (tenants ?? [])
    .slice()
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Platform-wide metrics and insights.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Tenants"
          value={overview?.totalTenants ?? 0}
          icon={BarChart3}
          loading={overviewLoading}
        />
        <StatCard
          title="Total Users"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          loading={overviewLoading}
        />
        <StatCard
          title="Active (24h)"
          value={overview?.activeMembers24h ?? 0}
          icon={TrendingUp}
          loading={overviewLoading}
        />
      </div>

      {/* Tenant Growth Chart */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Tenant Growth (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {growthLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : growthChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No growth data available.</p>
          ) : (
            <BarChart data={growthChartData} height={280} showValues />
          )}
        </CardContent>
      </Card>

      {/* Top Tenants by Members */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Top Tenants by Members</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants yet.</p>
          ) : (
            <div className="space-y-2">
              {topTenants.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">@{t.slug}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {t.memberCount} member{t.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
