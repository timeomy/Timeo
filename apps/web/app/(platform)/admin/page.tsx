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
} from "@timeo/ui/web";
import {
  Building2,
  Users,
  Calendar,
  Activity,
  ArrowRight,
  ScrollText,
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

export default function PlatformOverviewPage() {
  const health = useQuery(api.platform.getSystemHealth);
  const loading = health === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-muted-foreground">
          System health and aggregate metrics across all tenants.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={loading ? "" : health.totalTenants}
          icon={Building2}
          description="All registered businesses"
          loading={loading}
        />
        <StatCard
          title="Active Tenants"
          value={loading ? "" : health.activeTenants}
          icon={Activity}
          description="Currently active"
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={loading ? "" : health.totalUsers}
          icon={Users}
          description="All platform users"
          loading={loading}
        />
        <StatCard
          title="Total Bookings"
          value={loading ? "" : health.totalBookings}
          icon={Calendar}
          description={
            loading
              ? ""
              : `${health.pendingBookings} pending`
          }
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/tenants"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Manage Tenants</p>
                <p className="text-xs text-muted-foreground">
                  View and manage all businesses
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              href="/admin/audit-logs"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View Audit Logs</p>
                <p className="text-xs text-muted-foreground">
                  Track system-wide activity
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Tenant Dashboard</p>
                <p className="text-xs text-muted-foreground">
                  Switch to business view
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      {!loading && (
        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">System Status</CardTitle>
            <Link href="/admin/audit-logs" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View Logs <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-white/[0.06] p-4">
                <p className="text-sm text-muted-foreground">Pending Bookings</p>
                <p className="mt-1 text-2xl font-bold">
                  {health.pendingBookings}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] p-4">
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="mt-1 text-2xl font-bold">
                  {health.pendingOrders}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
