"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Dumbbell,
  Users,
  ScanLine,
  Cpu,
  ArrowRight,
  UserCheck,
  UserPlus,
  Activity,
  Clock,
  SmilePlus,
  CreditCard,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type GymOverview = {
  todayCheckIns: number;
  activeMembers: number;
  enrolledFaces: number;
  devicesOnline: number;
  recentActivity: Array<{
    id: string;
    memberName: string;
    action: string;
    method: string;
    time: string;
  }>;
};

// ---- Data hook ----

function useGymOverview() {
  const { tenantId } = useTenantId();
  return useQuery<GymOverview>({
    queryKey: ["gym", tenantId, "/overview"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/overview`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load gym overview");
      return data.data as GymOverview;
    },
    enabled: !!tenantId,
  });
}

// ---- Components ----

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  index = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  index?: number;
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
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <p className="mt-1 text-3xl font-bold text-glow">{value}</p>
              )}
              {description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {description}
                </p>
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

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
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

function formatRelative(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const METHOD_STYLE: Record<string, string> = {
  qr: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  face: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  manual: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

// ---- Page ----

export default function GymOverviewPage() {
  const { data, isLoading } = useGymOverview();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/tenants/ws-fitness-logo.png"
              alt="WS Fitness"
              className="h-10 w-auto"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                const fallback = el.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div
              className="hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10"
            >
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gym</h1>
              <p className="mt-0.5 text-muted-foreground">
                Access control, members, and device management.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Check-ins"
          value={isLoading ? "" : data?.todayCheckIns ?? 0}
          icon={ScanLine}
          description="Members checked in today"
          loading={isLoading}
          index={0}
        />
        <StatCard
          title="Active Members"
          value={isLoading ? "" : data?.activeMembers ?? 0}
          icon={Users}
          description="With active memberships"
          loading={isLoading}
          index={1}
        />
        <StatCard
          title="Enrolled Faces"
          value={isLoading ? "" : data?.enrolledFaces ?? 0}
          icon={SmilePlus}
          description="Face recognition ready"
          loading={isLoading}
          index={2}
        />
        <StatCard
          title="Devices Online"
          value={isLoading ? "" : data?.devicesOnline ?? 0}
          icon={Cpu}
          description="Turnstile controllers"
          loading={isLoading}
          index={3}
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction
              href="/dashboard/gym/members"
              icon={UserCheck}
              title="View Members"
              desc="Manage gym memberships"
            />
            <QuickAction
              href="/dashboard/gym/members/new"
              icon={UserPlus}
              title="Add Member"
              desc="Register a new gym member"
            />
            <QuickAction
              href="/dashboard/gym/scanner"
              icon={ScanLine}
              title="QR Scanner"
              desc="Scan member QR codes"
            />
            <QuickAction
              href="/dashboard/gym/checkins"
              icon={Activity}
              title="Check-in Feed"
              desc="Live check-in activity"
            />
            <QuickAction
              href="/dashboard/gym/turnstile"
              icon={Cpu}
              title="Manage Devices"
              desc="Turnstile controllers"
            />
            <QuickAction
              href="/dashboard/gym/payments"
              icon={CreditCard}
              title="Payment Requests"
              desc="Review DuitNow payment receipts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Link href="/dashboard/gym/checkins">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                    <Skeleton className="h-3 w-20 bg-white/[0.06]" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : (data?.recentActivity?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data!.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(item.memberName?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {item.memberName}
                      </p>
                      <p className="text-xs text-white/40">{item.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        METHOD_STYLE[item.method] ?? METHOD_STYLE.manual,
                      )}
                    >
                      {item.method}
                    </Badge>
                    <span className="text-xs text-white/40">
                      {formatRelative(item.time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-white/[0.04] p-3 mb-3">
                <Clock className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">
                No recent activity
              </p>
              <p className="text-xs text-white/30 mt-1">
                Check-ins will appear here as members enter the gym.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
