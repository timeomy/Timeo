"use client";

import { useState, useMemo } from "react";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  useRevenueOverview,
  useBookingAnalytics,
  useOrderAnalytics,
  useTopServices,
  useTopProducts,
  useStaffPerformance,
  useRevenueTrend,
  useBookingTrend,
  useDownloadReport,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@timeo/ui/web";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  CalendarCheck,
  ShoppingCart,
  Users,
  Download,
} from "lucide-react";

type Period = "7d" | "30d" | "90d";

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
};

const AXIS_TICK = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

function getDateRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}


function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-24 bg-white/[0.06]" />
          ) : (
            <p className="text-xl font-bold text-white">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-52 w-full bg-white/[0.06]" /> : children}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function AnalyticsDashboardPage() {
  const { tenantId } = useTenantId();
  const [period, setPeriod] = useState<Period>("30d");

  const { data: revenue, isLoading: revLoading } = useRevenueOverview(tenantId, period);
  const { data: bookings, isLoading: bookLoading } = useBookingAnalytics(tenantId, period);
  const { data: orders, isLoading: ordLoading } = useOrderAnalytics(tenantId, period);
  const { data: topServices, isLoading: svcLoading } = useTopServices(tenantId);
  const { data: topProducts, isLoading: prodLoading } = useTopProducts(tenantId);
  const { data: staff, isLoading: staffLoading } = useStaffPerformance(tenantId);
  const { data: revenueTrend, isLoading: rtLoading } = useRevenueTrend(tenantId, period);
  const { data: bookingTrend, isLoading: btLoading } = useBookingTrend(tenantId, period);

  const { downloadRevenue, downloadBookings, downloadProducts } = useDownloadReport(tenantId ?? "");
  const { from, to } = useMemo(() => getDateRange(period), [period]);

  const orderStatuses = useMemo(() => {
    if (!orders?.ordersByStatus) return [];
    return Object.entries(orders.ordersByStatus).map(([status, count]) => ({
      status,
      count: count ?? 0,
    }));
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-white/50">Business performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export buttons */}
          <div className="hidden gap-1 sm:flex">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-white/50 hover:text-white"
              onClick={() => downloadRevenue(from, to)}
            >
              <Download className="h-3 w-3" />
              Revenue CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-white/50 hover:text-white"
              onClick={() => downloadBookings(from, to)}
            >
              <Download className="h-3 w-3" />
              Bookings CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-white/50 hover:text-white"
              onClick={() => downloadProducts(from, to)}
            >
              <Download className="h-3 w-3" />
              Products CSV
            </Button>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-card/50 p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={period === opt.value ? "default" : "ghost"}
                onClick={() => setPeriod(opt.value)}
                className="h-7 px-3 text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1 — Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue (MYR)"
          value={formatPrice(revenue?.totalRevenue ?? 0, "MYR")}
          icon={TrendingUp}
          loading={revLoading}
        />
        <StatCard
          title="Total Bookings"
          value={String(bookings?.totalBookings ?? 0)}
          icon={CalendarCheck}
          loading={bookLoading}
        />
        <StatCard
          title="Total Orders"
          value={String(orders?.totalOrders ?? 0)}
          icon={ShoppingCart}
          loading={ordLoading}
        />
        <StatCard
          title="Staff Members"
          value={String(staff?.length ?? 0)}
          icon={Users}
          loading={staffLoading}
        />
      </div>

      {/* Row 2 — Revenue Trend */}
      <ChartCard title="Revenue Trend" loading={rtLoading}>
        {revenueTrend && revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) => `RM${(v / 100).toFixed(0)}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`RM${(v / 100).toFixed(2)}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-52 items-center justify-center">
            <p className="text-sm text-white/30">No trend data available</p>
          </div>
        )}
      </ChartCard>

      {/* Row 3 — Booking Trend + Order Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Booking Trend" loading={btLoading}>
          {bookingTrend && bookingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Bookings" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-white/30">No trend data available</p>
            </div>
          )}
        </ChartCard>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {ordLoading ? (
              <Skeleton className="h-32 w-full bg-white/[0.06]" />
            ) : orderStatuses.length > 0 ? (
              <div className="space-y-3">
                {orderStatuses.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[status] ?? "bg-white/[0.06] text-white/60 border-white/[0.08]"}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-white/[0.06] pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Total Revenue</span>
                    <span className="text-sm font-bold text-white">
                      {formatPrice(orders?.totalRevenue ?? 0, "MYR")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-white/30">No order data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Top Services + Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top Services" loading={svcLoading}>
          {topServices && topServices.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topServices} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Bookings" fill="#6366f1" radius={[0, 4, 4, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-white/30">No service data</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top Products" loading={prodLoading}>
          {topProducts && topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `RM${(v / 100).toFixed(0)}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`RM${(v / 100).toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-white/30">No product data</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Row 5 — Staff Performance */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base text-white">Staff Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {staffLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/[0.06]" />
              ))}
            </div>
          ) : staff && staff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Name</TableHead>
                  <TableHead className="text-right text-white/50">Bookings</TableHead>
                  <TableHead className="text-right text-white/50">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.staffId} className="border-white/[0.06] hover:bg-white/[0.02]">
                    <TableCell className="font-medium text-white">{s.staffName}</TableCell>
                    <TableCell className="text-right text-white/70">{s.bookingsCompleted}</TableCell>
                    <TableCell className="text-right font-medium text-white">
                      {formatPrice(s.revenue, "MYR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-white/30">No staff data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
