"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
} from "@timeo/ui/web";
import {
  Calendar,
  ShoppingBag,
  ClipboardList,
  DollarSign,
  Users,
  ArrowRight,
  TrendingUp,
  Clock,
  Package,
  Plus,
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

export default function DashboardPage() {
  const { tenantId } = useTenantId();

  const revenue = useQuery(
    api.analytics.getRevenueOverview,
    tenantId ? { tenantId, period: "month" } : "skip"
  );
  const bookings = useQuery(
    api.analytics.getBookingAnalytics,
    tenantId ? { tenantId, period: "month" } : "skip"
  );
  const orders = useQuery(
    api.analytics.getOrderAnalytics,
    tenantId ? { tenantId, period: "month" } : "skip"
  );

  const loading = revenue === undefined || bookings === undefined || orders === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your business performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </Link>
          <Link href="/dashboard/products">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={loading ? "" : formatPrice(revenue?.totalRevenue ?? 0, "MYR")}
          icon={DollarSign}
          description="This month"
          loading={loading}
        />
        <StatCard
          title="Bookings"
          value={loading ? "" : bookings?.totalBookings ?? 0}
          icon={Calendar}
          description={loading ? "" : `${bookings?.bookingsByStatus?.pending ?? 0} pending`}
          loading={loading}
        />
        <StatCard
          title="Orders"
          value={loading ? "" : orders?.totalOrders ?? 0}
          icon={Package}
          description={loading ? "" : `${orders?.ordersByStatus?.pending ?? 0} pending`}
          loading={loading}
        />
        <StatCard
          title="Completion Rate"
          value={loading ? "" : `${bookings?.completionRate ?? 0}%`}
          icon={TrendingUp}
          description="Bookings completed"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Manage Bookings</p>
                <p className="text-xs text-muted-foreground">
                  View & confirm bookings
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Process Orders</p>
                <p className="text-xs text-muted-foreground">
                  Update order statuses
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/team"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Invite Staff</p>
                <p className="text-xs text-muted-foreground">
                  Grow your team
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/scheduling"
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Set Hours</p>
                <p className="text-xs text-muted-foreground">
                  Business & staff schedules
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Bookings */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Bookings</CardTitle>
              <Link href="/dashboard/bookings">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(bookings?.bookingsByStatus?.pending ?? 0) > 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have{" "}
                  <span className="font-semibold text-primary">
                    {bookings?.bookingsByStatus?.pending}
                  </span>{" "}
                  bookings waiting to be confirmed.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pending bookings. All caught up!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Orders</CardTitle>
              <Link href="/dashboard/orders">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(orders?.ordersByStatus?.pending ?? 0) > 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have{" "}
                  <span className="font-semibold text-primary">
                    {orders?.ordersByStatus?.pending}
                  </span>{" "}
                  orders to process.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pending orders. All caught up!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
