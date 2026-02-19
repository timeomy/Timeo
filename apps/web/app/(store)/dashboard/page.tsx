"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import type { AnalyticsPeriod } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  BarChart,
  cn,
} from "@timeo/ui/web";
import {
  DollarSign,
  CalendarCheck,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "day" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

function StatCardWeb({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend ? (
          <div className="mt-1 flex items-center gap-1">
            {trend.direction === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.direction === "up" ? "text-green-500" : "text-red-500"
              )}
            >
              {trend.value}%
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeTenantId } = useTimeoWebAuthContext();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const tenantId = activeTenantId;

  const revenue = useQuery(
    api.analytics.getRevenueOverview,
    tenantId ? { tenantId: tenantId as any, period } : "skip"
  );
  const bookingStats = useQuery(
    api.analytics.getBookingAnalytics,
    tenantId ? { tenantId: tenantId as any, period } : "skip"
  );
  const orderStats = useQuery(
    api.analytics.getOrderAnalytics,
    tenantId ? { tenantId: tenantId as any, period } : "skip"
  );
  const topServices = useQuery(
    api.analytics.getTopServices,
    tenantId ? { tenantId: tenantId as any, period, limit: 10 } : "skip"
  );
  const topProducts = useQuery(
    api.analytics.getTopProducts,
    tenantId ? { tenantId: tenantId as any, period, limit: 10 } : "skip"
  );

  const isLoading =
    revenue === undefined ||
    bookingStats === undefined ||
    orderStats === undefined;

  if (!tenantId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">
          No organization selected. Please select an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}
        >
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Row */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardWeb
            label="Total Revenue"
            value={formatPrice(revenue?.totalRevenue ?? 0)}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            trend={
              revenue?.percentChange !== undefined
                ? {
                    value: Math.abs(revenue.percentChange),
                    direction:
                      revenue.percentChange >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <StatCardWeb
            label="Bookings"
            value={bookingStats?.totalBookings ?? 0}
            icon={
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            }
          />
          <StatCardWeb
            label="Orders"
            value={orderStats?.totalOrders ?? 0}
            icon={
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            }
          />
          <StatCardWeb
            label="Completion Rate"
            value={`${bookingStats?.completionRate ?? 0}%`}
            icon={
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            }
          />
        </div>
      )}

      {/* Revenue Chart */}
      {!isLoading && revenue ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                Bookings: {formatPrice(revenue.bookingRevenue)}
              </span>
              <span>Orders: {formatPrice(revenue.orderRevenue)}</span>
              {revenue.percentChange !== 0 ? (
                <Badge
                  variant={
                    revenue.percentChange >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {revenue.percentChange >= 0 ? "+" : ""}
                  {revenue.percentChange}%
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={(revenue.revenueByDay ?? []).slice(-21).map((d) => ({
                label: d.date.slice(5),
                value: d.amount,
              }))}
              height={180}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Services Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices === undefined ? (
              <Skeleton className="h-40" />
            ) : (topServices ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No service data for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topServices ?? []).map((svc, i) => (
                    <TableRow key={svc.serviceId}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{svc.serviceName}</TableCell>
                      <TableCell className="text-right">
                        {svc.bookingCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(svc.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts === undefined ? (
              <Skeleton className="h-40" />
            ) : (topProducts ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No product data for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topProducts ?? []).map((prod, i) => (
                    <TableRow key={prod.productId}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{prod.productName}</TableCell>
                      <TableCell className="text-right">
                        {prod.unitsSold}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(prod.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Stats */}
      {!isLoading && bookingStats ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bookings by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(bookingStats.bookingsByStatus).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm capitalize text-muted-foreground">
                        {status.replace("_", " ")}
                      </span>
                      <span className="text-sm font-medium">
                        {count as number}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={(bookingStats.bookingsByDay ?? []).slice(-14).map(
                  (d) => ({
                    label: d.date.slice(8),
                    value: d.count,
                  })
                )}
                height={140}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Orders Stats */}
      {!isLoading && orderStats ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Orders
                </p>
                <p className="text-xl font-bold">{orderStats.totalOrders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Completed
                </p>
                <p className="text-xl font-bold">
                  {orderStats.completedOrders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg Order Value
                </p>
                <p className="text-xl font-bold">
                  {formatPrice(orderStats.averageOrderValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
