"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Badge,
} from "@timeo/ui/web";
import {
  Building2,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Activity,
} from "lucide-react";

function StatCard({
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
    <Card className="glass-card">
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

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function PlatformDashboardPage() {
  const health = useQuery(api.platform.getSystemHealth);
  const tenants = useQuery(api.platform.listAllTenants);

  const loading = health === undefined;
  const recentTenants = tenants?.slice(-5).reverse() ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            System overview and tenant management.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/platform/tenants/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tenant
            </Button>
          </Link>
          <Link href="/platform/tenants">
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              View All
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={loading ? "" : health.totalTenants}
          icon={Building2}
          description={loading ? "" : `${health.activeTenants} active`}
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={loading ? "" : health.totalUsers}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Total Bookings"
          value={loading ? "" : health.totalBookings}
          icon={Calendar}
          description={loading ? "" : `${health.pendingBookings} pending`}
          loading={loading}
        />
        <StatCard
          title="Pending Orders"
          value={loading ? "" : health.pendingOrders}
          icon={Clock}
          loading={loading}
        />
      </div>

      {/* Recent Tenants */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Tenants</CardTitle>
          <Link href="/platform/tenants">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tenants === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentTenants.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No tenants yet.</p>
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
                  key={tenant._id}
                  href={`/platform/tenants/${tenant._id}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">@{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={planColors[tenant.plan] ?? ""}>
                      {tenant.plan}
                    </Badge>
                    <Badge variant="outline" className={statusColors[tenant.status] ?? ""}>
                      {tenant.status}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatDate(tenant.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      {!loading && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">System Healthy</p>
                <p className="text-xs text-muted-foreground">
                  Last checked: {new Date(health.timestamp).toLocaleTimeString("en-MY")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
