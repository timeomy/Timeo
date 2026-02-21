"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTenantId } from "@/hooks/use-tenant-id";
import { useTimeoWebAuthContext, isRoleAtLeast } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Badge,
  cn,
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
  ScanLine,
  NotebookPen,
  UserCheck,
  Store,
  CreditCard,
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

// ─── Admin Dashboard ──────────────────────────────────────────────────────

function AdminDashboard({ tenantId }: { tenantId: any }) {
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
    <>
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
            <QuickAction href="/dashboard/bookings" icon={ClipboardList} title="Manage Bookings" desc="View & confirm bookings" />
            <QuickAction href="/dashboard/orders" icon={ShoppingBag} title="Process Orders" desc="Update order statuses" />
            <QuickAction href="/dashboard/team" icon={Users} title="Invite Staff" desc="Grow your team" />
            <QuickAction href="/dashboard/scheduling" icon={Clock} title="Set Hours" desc="Business & staff schedules" />
          </div>
        </CardContent>
      </Card>

      {/* Pending Summary */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
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
    </>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────

function StaffDashboard({ tenantId }: { tenantId: any }) {
  const bookings = useQuery(
    api.analytics.getBookingAnalytics,
    tenantId ? { tenantId, period: "month" } : "skip"
  );
  const checkInStats = useQuery(
    api.checkIns.getStats,
    tenantId ? { tenantId } : "skip"
  );
  const recentCheckIns = useQuery(
    api.checkIns.listByTenant,
    tenantId ? { tenantId } : "skip"
  );
  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const loading = bookings === undefined || checkInStats === undefined;
  const todayCheckIns = recentCheckIns?.slice(0, 5) ?? [];
  const activeMembers = members?.filter((m: any) => m.status === "active").length ?? 0;

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Check-ins"
          value={loading ? "" : checkInStats?.today ?? 0}
          icon={ScanLine}
          description={`${checkInStats?.thisWeek ?? 0} this week`}
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
          title="Active Members"
          value={members === undefined ? "" : activeMembers}
          icon={UserCheck}
          description="In your business"
          loading={members === undefined}
        />
        <StatCard
          title="Check-in Methods"
          value={loading ? "" : `${checkInStats?.byMethod?.qr ?? 0} QR`}
          icon={CreditCard}
          description={loading ? "" : `${checkInStats?.byMethod?.manual ?? 0} manual today`}
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
            <QuickAction href="/dashboard/check-ins" icon={ScanLine} title="Check-ins" desc="Process member check-ins" />
            <QuickAction href="/dashboard/bookings" icon={ClipboardList} title="Bookings" desc="View & manage bookings" />
            <QuickAction href="/dashboard/session-logs" icon={NotebookPen} title="Session Logs" desc="Log training sessions" />
            <QuickAction href="/dashboard/pos" icon={Store} title="POS" desc="Process transactions" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-ins & Pending Bookings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Check-ins</CardTitle>
            <Link href="/dashboard/check-ins">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayCheckIns.length > 0 ? (
              <div className="space-y-3">
                {todayCheckIns.map((ci: any) => (
                  <div key={ci._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(ci.userName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-white/80">{ci.userName ?? "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        ci.method === "qr" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        ci.method === "nfc" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {ci.method}
                      </Badge>
                      <span className="text-xs text-white/40">
                        {new Date(ci.timestamp).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No check-ins today yet.
              </p>
            )}
          </CardContent>
        </Card>

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
            {!loading && (bookings?.bookingsByStatus?.pending ?? 0) > 0 ? (
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
      </div>
    </>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────

function QuickAction({ href, icon: Icon, title, desc }: {
  href: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.03]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tenantId } = useTenantId();
  const { activeRole } = useTimeoWebAuthContext();

  const isAdmin = isRoleAtLeast(activeRole, "admin");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin
              ? "Overview of your business performance."
              : "Your workspace at a glance."}
          </p>
        </div>
        {isAdmin && (
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
        )}
      </div>

      {isAdmin ? (
        <AdminDashboard tenantId={tenantId} />
      ) : (
        <StaffDashboard tenantId={tenantId} />
      )}
    </div>
  );
}
