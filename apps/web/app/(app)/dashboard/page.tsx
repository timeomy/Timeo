"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  useMissionControl,
  useCheckIns,
  useCheckInStats,
  useStaffMembers,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import { useTimeoWebAuthContext, isRoleAtLeast } from "@timeo/auth/web";
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
  TrendingDown,
  Clock,
  Package,
  Plus,
  ScanLine,
  NotebookPen,
  UserCheck,
  Store,
  CreditCard,
  BarChart3,
  Cpu,
  Dumbbell,
  Users2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  index = 0,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  index?: number;
  trend?: { value: number; label: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.06 }}
    >
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <div className="flex items-end gap-2">
                  <p className="mt-1 text-3xl font-bold text-glow">{value}</p>
                  {trend && !loading && (
                    <span className={cn(
                      "mb-1.5 flex items-center gap-0.5 text-xs font-semibold",
                      trend.value >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {trend.value >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {trend.label}
                    </span>
                  )}
                </div>
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
    </motion.div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────

function AdminDashboard({ tenantId }: { tenantId: string }) {
  const { data: mc, isLoading } = useMissionControl(tenantId);
  const metrics = mc?.metrics;

  const monthRevenueMYR = metrics ? metrics.monthRevenue / 100 : 0;
  const revenueDisplay = isLoading
    ? ""
    : `RM ${monthRevenueMYR.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={isLoading ? "" : metrics?.totalMembers ?? 0}
          icon={Users}
          description="Registered members"
          loading={isLoading}
          index={0}
          trend={
            !isLoading && metrics
              ? {
                  value: (metrics.newMembersThisMonth ?? 0) - (metrics.newMembersLastMonth ?? 0),
                  label: `+${metrics.newMembersThisMonth ?? 0} this month`,
                }
              : undefined
          }
        />
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? "" : metrics?.activeSubscriptions ?? 0}
          icon={TrendingUp}
          description="Current active packages"
          loading={isLoading}
          index={1}
        />
        <StatCard
          title="Revenue This Month"
          value={isLoading ? "" : revenueDisplay}
          icon={DollarSign}
          description="Collected this month"
          loading={isLoading}
          index={2}
        />
        <StatCard
          title="Check-ins This Week"
          value={isLoading ? "" : metrics?.weekCheckIns ?? 0}
          icon={ScanLine}
          description={isLoading ? "" : `${metrics?.todayCheckIns ?? 0} today`}
          loading={isLoading}
          index={3}
          trend={
            !isLoading && metrics
              ? {
                  value: metrics.todayCheckIns ?? 0,
                  label: `${metrics.todayCheckIns ?? 0} today`,
                }
              : undefined
          }
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/dashboard/mission-control" icon={Cpu} title="Mission Control" desc="Live ops & check-in feed" />
            <QuickAction href="/dashboard/gym/members" icon={UserCheck} title="Members" desc="View & manage members" />
            <QuickAction href="/dashboard/team" icon={Users} title="Team" desc="Staff & coaches" />
            <QuickAction href="/dashboard/analytics" icon={BarChart3} title="Analytics" desc="Revenue & performance" />
          </div>
        </CardContent>
      </Card>

      {/* Member Growth & Revenue Overview */}
      {!isLoading && metrics && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Member Growth</CardTitle>
              <Link href="/dashboard/gym/members">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{metrics.newMembersThisMonth}</span> new members this month,{" "}
                <span className="font-semibold text-white/70">{metrics.newMembersLastMonth}</span> joined last month.
              </p>
              {/* Mini bar chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last Month</span>
                  <span>{metrics.newMembersLastMonth} members</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white/30 transition-all"
                    style={{ width: `${Math.min(100, ((metrics.newMembersLastMonth ?? 0) / Math.max(1, metrics.newMembersThisMonth ?? 1, metrics.newMembersLastMonth ?? 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>This Month</span>
                  <span>{metrics.newMembersThisMonth} members</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, ((metrics.newMembersThisMonth ?? 0) / Math.max(1, metrics.newMembersThisMonth ?? 1, metrics.newMembersLastMonth ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Team & Revenue</CardTitle>
              <Link href="/dashboard/analytics">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Analytics <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Staff</p>
                    <p className="text-xs text-muted-foreground">Team members</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary">{metrics.staffCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Revenue This Month</p>
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400">
                  RM {(metrics.monthRevenue / 100).toLocaleString("en-MY", { minimumFractionDigits: 0 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────

function StaffDashboard({ tenantId }: { tenantId: string }) {
  const { data: stats, isLoading: statsLoading } = useCheckInStats(tenantId);
  const { data: recentCheckIns } = useCheckIns(tenantId);
  const { data: members, isLoading: membersLoading } = useStaffMembers(tenantId);

  const loading = statsLoading;
  const todayCheckIns = recentCheckIns?.slice(0, 5) ?? [];
  const activeMembers = members?.filter((m: any) => m.status === "active").length ?? members?.length ?? 0;

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Check-ins"
          value={loading ? "" : stats?.today ?? 0}
          icon={ScanLine}
          description={`${stats?.thisWeek ?? 0} this week`}
          loading={loading}
          index={0}
        />
        <StatCard
          title="This Month"
          value={loading ? "" : stats?.monthCount ?? 0}
          icon={TrendingUp}
          description="Total check-ins"
          loading={loading}
          index={1}
        />
        <StatCard
          title="Staff Members"
          value={membersLoading ? "" : activeMembers}
          icon={UserCheck}
          description="On your team"
          loading={membersLoading}
          index={2}
        />
        <StatCard
          title="QR Check-ins Today"
          value={loading ? "" : `${stats?.byMethod?.qr ?? 0}`}
          icon={CreditCard}
          description={loading ? "" : `${stats?.byMethod?.manual ?? 0} manual`}
          loading={loading}
          index={3}
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/dashboard/gym/checkins" icon={ScanLine} title="Check-in Feed" desc="Monitor check-ins" />
            <QuickAction href="/dashboard/gym/scanner" icon={ClipboardList} title="QR Scanner" desc="Scan member codes" />
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
            <Link href="/dashboard/gym/checkins">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayCheckIns.length > 0 ? (
              <div className="space-y-3">
                {todayCheckIns.map((ci: any) => (
                  <div key={ci.id} className="flex items-center justify-between text-sm">
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
                        {new Date(ci.checkedInAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
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
            <CardTitle className="text-lg">This Week</CardTitle>
            <Link href="/dashboard/gym/checkins">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{stats?.thisWeek ?? 0}</span> check-ins this week,{" "}
              <span className="font-semibold text-primary">{stats?.today ?? 0}</span> today.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Coach Dashboard ──────────────────────────────────────────────────────

type CoachClient = {
  id: string;
  name: string;
  email: string;
  totalSessions: number;
  lastSession: string | null;
  remainingClasses: number | null;
  packageName: string | null;
  status: string;
};

type CoachBooking = {
  id: string;
  clientId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  clientName: string | null;
};

type TrainingLogEntry = {
  id: string;
  clientId: string;
  clientName: string;
  sessionType: string;
  trainingTypes: string[];
  notes: string | null;
  createdAt: string;
};

function useCoachClients(tenantId: string | null) {
  return useQuery<CoachClient[]>({
    queryKey: ["coach", tenantId, "clients"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches/me/clients`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) return [];
      return data.data as CoachClient[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

function useCoachBookings(tenantId: string | null) {
  return useQuery<CoachBooking[]>({
    queryKey: ["coach", tenantId, "bookings"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches/me/bookings`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) return [];
      return data.data as CoachBooking[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

function useCoachRecentLogs(tenantId: string | null) {
  return useQuery<TrainingLogEntry[]>({
    queryKey: ["coach", tenantId, "training-logs"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches/training-logs`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) return [];
      return data.data as TrainingLogEntry[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

function CoachDashboard({ tenantId }: { tenantId: string }) {
  const { data: clients = [], isLoading: clientsLoading } = useCoachClients(tenantId);
  const { data: bookings = [], isLoading: bookingsLoading } = useCoachBookings(tenantId);
  const { data: recentLogs = [], isLoading: logsLoading } = useCoachRecentLogs(tenantId);

  const today = new Date().toISOString().split("T")[0];

  // Sessions logged today
  const sessionsToday = recentLogs.filter((log) => {
    if (!log.createdAt) return false;
    return log.createdAt.startsWith(today);
  }).length;

  // Upcoming bookings (today or future, confirmed)
  const upcomingBookings = bookings
    .filter((b) => b.bookingDate >= today && b.status !== "cancelled")
    .sort((a, b) => {
      if (a.bookingDate !== b.bookingDate) return a.bookingDate.localeCompare(b.bookingDate);
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5);

  // Recent logs (last 5)
  const latestLogs = recentLogs.slice(0, 5);

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="My Clients"
          value={clientsLoading ? "" : clients.length}
          icon={Users2}
          description="Assigned to you"
          loading={clientsLoading}
          index={0}
        />
        <StatCard
          title="Sessions Today"
          value={logsLoading ? "" : sessionsToday}
          icon={Dumbbell}
          description="Logged today"
          loading={logsLoading}
          index={1}
        />
        <StatCard
          title="Upcoming Sessions"
          value={bookingsLoading ? "" : upcomingBookings.length}
          icon={Calendar}
          description="Scheduled ahead"
          loading={bookingsLoading}
          index={2}
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/dashboard/training-logs" icon={NotebookPen} title="Log Session" desc="Record a client session" />
            <QuickAction href="/dashboard/my-clients" icon={Users2} title="My Clients" desc="View your clients" />
            <QuickAction href="/dashboard/scheduling" icon={Calendar} title="Schedule" desc="Manage bookings" />
            <QuickAction href="/dashboard/gym/checkins" icon={ScanLine} title="Check-ins" desc="Monitor gym activity" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions & Recent Logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
            <Link href="/dashboard/scheduling">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((b) => {
                  const isToday = b.bookingDate === today;
                  const dateLabel = isToday
                    ? "Today"
                    : new Date(b.bookingDate).toLocaleDateString("en-MY", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      });
                  return (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(b.clientName?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white/80 font-medium">{b.clientName ?? "Client"}</p>
                          <p className="text-xs text-white/40">{dateLabel} · {b.startTime}–{b.endTime}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        b.status === "confirmed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {b.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming sessions scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Session Logs */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
            <Link href="/dashboard/training-logs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : latestLogs.length > 0 ? (
              <div className="space-y-3">
                {latestLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(log.clientName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white/80 font-medium">{log.clientName ?? "Client"}</p>
                        <p className="text-xs text-white/40">
                          {log.trainingTypes?.length > 0
                            ? log.trainingTypes.join(", ")
                            : log.sessionType ?? "Session"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-white/40">
                      {new Date(log.createdAt).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions logged yet. Start by logging a session.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clients Overview */}
      {!clientsLoading && clients.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Clients</CardTitle>
            <Link href="/dashboard/my-clients">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clients.slice(0, 6).map((client) => (
                <Link key={client.id} href={`/dashboard/my-clients/${client.id}`}>
                  <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-3 transition-all hover:border-primary/20 hover:bg-white/[0.03]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary flex-shrink-0">
                      {client.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{client.name}</p>
                      <p className="text-xs text-white/40">
                        {client.remainingClasses != null
                          ? `${client.remainingClasses} sessions left`
                          : `${client.totalSessions} sessions total`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tenantId } = useTenantId();
  const { activeRole } = useTimeoWebAuthContext();

  const isAdmin = isRoleAtLeast(activeRole, "admin");
  const isCoach = activeRole === "coach";

  const heading = isAdmin
    ? "Overview of your business performance."
    : isCoach
    ? "Your coaching workspace."
    : "Your workspace at a glance.";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">{heading}</p>
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

      {tenantId && (
        isAdmin ? (
          <AdminDashboard tenantId={tenantId} />
        ) : isCoach ? (
          <CoachDashboard tenantId={tenantId} />
        ) : (
          <StaffDashboard tenantId={tenantId} />
        )
      )}
    </div>
  );
}
