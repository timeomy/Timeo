"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
} from "@timeo/ui/web";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Range = "7d" | "30d" | "90d" | "12m";

interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface PlanSlice {
  plan: string;
  mrr: number;
}

interface TopTenant {
  name: string;
  mrr: number;
}

interface AnalyticsData {
  tenantGrowth: TimeSeriesPoint[];
  mrrGrowth: TimeSeriesPoint[];
  bookingsVolume: TimeSeriesPoint[];
  ordersVolume: TimeSeriesPoint[];
  revenueByPlan: PlanSlice[];
  topTenantsByRevenue: TopTenant[];
}

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "12m", value: "12m" },
];

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  starter: "#3b82f6",
  pro: "#a855f7",
  enterprise: "#f59e0b",
};

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"];

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
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function PlatformAnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "analytics", range],
    queryFn: () =>
      api.get<AnalyticsData>(`/api/platform/analytics?range=${range}`),
    staleTime: 60_000,
  });

  const tenantGrowth = data?.tenantGrowth ?? [];
  const mrrGrowth = data?.mrrGrowth ?? [];
  const bookingsVolume = data?.bookingsVolume ?? [];
  const ordersVolume = data?.ordersVolume ?? [];
  const revenueByPlan = data?.revenueByPlan ?? [];
  const topTenants = data?.topTenantsByRevenue ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Cross-tenant growth and revenue metrics.
          </p>
        </div>
        {/* Range Selector */}
        <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-card/50 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={range === opt.value ? "default" : "ghost"}
              onClick={() => setRange(opt.value)}
              className="h-7 px-3 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant Growth — Line */}
        <ChartCard title="Tenant Growth" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tenantGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Tenants"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* MRR Growth — Area */}
        <ChartCard title="MRR Growth (RM)" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrGrowth}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v: number) => `RM${(v / 100).toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`RM${(v / 100).toFixed(0)}`, "MRR"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="MRR"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#mrrGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bookings Volume — Bar */}
        <ChartCard title="Bookings Volume" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bookingsVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                name="Bookings"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Orders Volume — Bar */}
        <ChartCard title="Orders Volume" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                name="Orders"
                fill={CHART_COLORS[1]}
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by Plan — Donut / Pie */}
        <ChartCard title="Revenue by Plan" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={revenueByPlan}
                dataKey="mrr"
                nameKey="plan"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {revenueByPlan.map((slice, index) => (
                  <Cell
                    key={slice.plan}
                    fill={PLAN_COLORS[slice.plan] ?? CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`RM${(v / 100).toFixed(0)}`, "MRR"]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Tenants by Revenue — Horizontal Bar */}
        <ChartCard title="Top Tenants by Revenue" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={topTenants}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `RM${(v / 100).toFixed(0)}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`RM${(v / 100).toFixed(0)}`, "MRR"]}
              />
              <Bar
                dataKey="mrr"
                name="MRR"
                fill={CHART_COLORS[2]}
                radius={[0, 4, 4, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
