"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useTenantId } from "@/hooks/use-tenant-id";
import { useMissionControl } from "@timeo/api-client";
import type { MissionControlCheckIn, HeatmapCell } from "@timeo/api-client";
import Link from "next/link";
import {
  Users,
  ScanLine,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users2,
  UserPlus,
  RefreshCw,
  Activity,
  Cpu,
  ArrowRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(cents: number, currency = "MYR"): string {
  const val = cents / 100;
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  });
}

const METHOD_COLORS: Record<string, string> = {
  qr: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  nfc: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  face: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  manual: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const METHOD_LABEL: Record<string, string> = {
  qr: "QR",
  nfc: "NFC",
  face: "Face",
  manual: "Manual",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`
);

// ─── Animated number counter ────────────────────────────────────────────────

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 100 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const [rendered, setRendered] = useState("0");

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setRendered(v));
    return unsub;
  }, [display]);

  return <span className={className}>{rendered}</span>;
}

// ─── Live Clock ──────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = time.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

  const timeStr = time.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });

  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold tracking-wider text-white tabular-nums">
        {timeStr}
      </div>
      <div className="text-xs uppercase tracking-widest text-white/40">{dateStr}</div>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  glowColor: string;
  trend?: number; // % change vs last period
  prefix?: string;
  isCurrency?: boolean;
  delay?: number;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  glowColor,
  trend,
  prefix,
  isCurrency,
  delay = 0,
}: MetricCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(value)
    : value.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all hover:border-white/[0.12]"
      style={{ boxShadow: `0 0 0 0 ${glowColor}` }}
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${glowColor}18 0%, transparent 70%)` }}
      />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${glowColor}20`, border: `1px solid ${glowColor}30` }}
          >
            <Icon className="h-4 w-4" style={{ color: glowColor }} />
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                trend >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="mb-1">
          {isCurrency ? (
            <div className="text-3xl font-bold tracking-tight text-white">
              {displayValue}
            </div>
          ) : (
            <div className="text-3xl font-bold tracking-tight text-white">
              {prefix}
              <AnimatedNumber value={value} />
            </div>
          )}
        </div>

        <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Check-in Feed ───────────────────────────────────────────────────────────

function CheckInFeed({ items }: { items: MissionControlCheckIn[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevFirstId = useRef<string>("");

  useEffect(() => {
    if (items[0]?.id !== prevFirstId.current) {
      prevFirstId.current = items[0]?.id ?? "";
    }
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Live Check-ins
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] p-3"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-xs font-bold text-white">
                {item.initials}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.userName}
                </p>
                <p className="text-xs text-white/40">{formatTime(item.timestamp)}</p>
              </div>

              {/* Method badge */}
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                  METHOD_COLORS[item.method] ?? "bg-white/10 text-white/50 border-white/10"
                }`}
              >
                {METHOD_LABEL[item.method] ?? item.method}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-white/20">
            No check-ins yet today
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Heatmap ────────────────────────────────────────────────────────

function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Build lookup map
  const cellMap: Record<string, number> = {};
  for (const cell of data) {
    cellMap[`${cell.day}-${cell.hour}`] = cell.count;
  }

  function getColor(count: number): string {
    if (count === 0) return "rgba(255,255,255,0.03)";
    const intensity = count / maxCount;
    if (intensity < 0.25) return `rgba(0,102,255,${0.15 + intensity * 0.4})`;
    if (intensity < 0.5) return `rgba(0,102,255,${0.35 + intensity * 0.3})`;
    if (intensity < 0.75) return `rgba(16,185,129,${0.5 + intensity * 0.3})`;
    return `rgba(245,158,11,${0.6 + intensity * 0.4})`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Activity Heatmap
        </h2>
        <p className="mt-0.5 text-xs text-white/20">Check-ins by day & hour</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Hour axis */}
        <div className="mb-1 flex pl-9">
          {HOUR_LABELS.map((label, h) => (
            <div
              key={h}
              className="flex-1 text-center text-[8px] text-white/20"
              style={{ minWidth: 0 }}
            >
              {h % 3 === 0 ? label : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 space-y-0.5">
          {DAY_LABELS.map((day, d) => (
            <div key={d} className="flex items-center gap-1">
              <span className="w-8 shrink-0 text-right text-[9px] text-white/30">
                {day}
              </span>
              <div className="flex flex-1 gap-0.5">
                {HOUR_LABELS.map((_, h) => {
                  const count = cellMap[`${d}-${h}`] ?? 0;
                  return (
                    <motion.div
                      key={h}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: (d * 24 + h) * 0.001 }}
                      title={`${day} ${HOUR_LABELS[h]}: ${count} check-ins`}
                      className="flex-1 cursor-default rounded-sm transition-transform hover:scale-125"
                      style={{
                        minWidth: 0,
                        aspectRatio: "1",
                        background: getColor(count),
                        minHeight: "10px",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] text-white/20">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: getColor(v * maxCount) }}
            />
          ))}
          <span className="text-[9px] text-white/20">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Membership Ring ─────────────────────────────────────────────────────────

function MembershipRing({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const segments = [
    { key: "active", label: "Active", color: "#10B981" },
    { key: "suspended", label: "Suspended", color: "#EF4444" },
    { key: "invited", label: "Invited", color: "#F59E0B" },
    { key: "inactive", label: "Inactive", color: "#6B7280" },
  ];

  // Build SVG donut
  const R = 42;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;

  const arcs = segments.map((seg) => {
    const value = breakdown[seg.key] ?? 0;
    const fraction = total > 0 ? value / total : 0;
    const dashLen = fraction * circumference;
    const offset = circumference - cumulative * circumference;
    cumulative += fraction;
    return { ...seg, value, fraction, dashLen, offset };
  });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Member Breakdown
        </h2>
      </div>

      <div className="flex flex-1 items-center gap-6">
        {/* SVG Donut */}
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="14"
            />
            {arcs.map((arc, i) => (
              <motion.circle
                key={arc.key}
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={arc.color}
                strokeWidth="14"
                strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                transform="rotate(-90 60 60)"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${arc.dashLen} ${circumference - arc.dashLen}` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              />
            ))}
            {/* Center text */}
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {total.toLocaleString()}
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="7"
              letterSpacing="1"
            >
              TOTAL
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {arcs.map((arc) => (
            <div key={arc.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: arc.color }}
                />
                <span className="text-xs text-white/50">{arc.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {arc.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MissionControlPage() {
  const { tenantId, tenant } = useTenantId();
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } =
    useMissionControl(tenantId);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const newMemberTrend =
    data?.metrics.newMembersLastMonth && data.metrics.newMembersLastMonth > 0
      ? Math.round(
          ((data.metrics.newMembersThisMonth - data.metrics.newMembersLastMonth) /
            data.metrics.newMembersLastMonth) *
            100,
        )
      : undefined;

  const metrics = data?.metrics;

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "#070B14" }}
    >
      {/* Ambient background mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #0066FF40 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #10B98130 0%, transparent 70%)" }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED50 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
        {/* Left: Brand + Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-blue-400" />
            <div>
              <h1
                className="text-sm font-bold uppercase tracking-[0.2em] text-white"
                style={{ textShadow: "0 0 20px rgba(0,102,255,0.5)" }}
              >
                Mission Control
              </h1>
              <p className="text-xs text-white/30">{tenant?.name ?? "Loading…"}</p>
            </div>
          </div>

          {/* System status */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">All Systems Nominal</span>
          </div>
        </div>

        {/* Right: Clock + Refresh */}
        <div className="flex items-center gap-6">
          {lastUpdated && (
            <div className="text-right">
              <p className="text-xs text-white/20">
                Updated {formatTime(lastUpdated.toISOString())}
              </p>
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 text-white/40 transition-all hover:border-white/[0.12] hover:text-white/80 disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <LiveClock />
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col gap-4 p-6">

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            Failed to load Mission Control data.{" "}
            <button onClick={() => refetch()} className="underline">
              Retry
            </button>
          </div>
        )}

        {/* ── Metrics Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]"
              />
            ))
          ) : (
            <>
              <MetricCard
                label="Total Members"
                value={metrics?.totalMembers ?? 0}
                icon={Users}
                color="#0066FF"
                glowColor="#0066FF"
                delay={0}
              />
              <MetricCard
                label="Today's Check-ins"
                value={metrics?.todayCheckIns ?? 0}
                icon={ScanLine}
                color="#10B981"
                glowColor="#10B981"
                delay={0.05}
              />
              <MetricCard
                label="Active Subscriptions"
                value={metrics?.activeSubscriptions ?? 0}
                icon={CreditCard}
                color="#8B5CF6"
                glowColor="#8B5CF6"
                delay={0.1}
              />
              <MetricCard
                label="Monthly Revenue"
                value={metrics?.monthRevenue ?? 0}
                icon={TrendingUp}
                color="#F59E0B"
                glowColor="#F59E0B"
                isCurrency
                delay={0.15}
              />
              <MetricCard
                label="Staff"
                value={metrics?.staffCount ?? 0}
                icon={Users2}
                color="#EC4899"
                glowColor="#EC4899"
                delay={0.2}
              />
              <MetricCard
                label="New Members"
                value={metrics?.newMembersThisMonth ?? 0}
                icon={UserPlus}
                color="#06B6D4"
                glowColor="#06B6D4"
                trend={newMemberTrend}
                delay={0.25}
              />
            </>
          )}
        </div>

        {/* ── Bottom Three-Panel Row ───────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr_2fr]" style={{ minHeight: 0, height: "calc(100vh - 340px)", maxHeight: "520px" }}>

          {/* Left: Check-in Feed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm"
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : (
              <CheckInFeed items={data?.recentCheckIns ?? []} />
            )}
          </motion.div>

          {/* Center: Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm"
          >
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-white/[0.03]" />
            ) : (
              <ActivityHeatmap data={data?.heatmap ?? []} />
            )}
          </motion.div>

          {/* Right: Membership Ring */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col gap-4 overflow-hidden"
          >
            {/* Ring chart */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm">
              {isLoading ? (
                <div className="h-full animate-pulse rounded-xl bg-white/[0.03]" />
              ) : (
                <MembershipRing breakdown={data?.membershipBreakdown ?? {}} />
              )}
            </div>

            {/* Week check-ins mini stat */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-white/40">
                7-Day Check-ins
              </p>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-3xl font-bold text-white">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-white/[0.05]" />
                  ) : (
                    <AnimatedNumber value={metrics?.weekCheckIns ?? 0} />
                  )}
                </div>
                <Activity className="h-5 w-5 text-white/20" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Quick Actions Strip ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="text-xs uppercase tracking-widest text-white/20">
            Quick Actions
          </span>
          {[
            { href: "/dashboard/gym/scanner", label: "Scan QR", color: "#0066FF" },
            { href: "/dashboard/members", label: "Add Member", color: "#10B981" },
            { href: "/dashboard/analytics", label: "View Reports", color: "#F59E0B" },
            { href: "/dashboard/team", label: "Invite Staff", color: "#8B5CF6" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-white/60 transition-all hover:border-white/[0.18] hover:text-white"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
