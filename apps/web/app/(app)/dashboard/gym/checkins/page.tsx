"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Activity,
  ScanLine,
  QrCode,
  SmilePlus,
  Hand,
  Filter,
  Clock,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type GymCheckIn = {
  id: string;
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
  membershipPlan: string | null;
  method: "qr" | "face" | "manual";
  status: "granted" | "denied";
  time: string;
};

type CheckInFeed = {
  todayTotal: number;
  checkIns: GymCheckIn[];
};

// ---- Data hook ----

function useGymCheckIns(methodFilter: string | null) {
  const { tenantId } = useTenantId();
  const queryPath = methodFilter ? `/checkins?method=${methodFilter}` : "/checkins";
  return useQuery<CheckInFeed>({
    queryKey: ["gym", tenantId, queryPath],
    queryFn: async () => {
      const url = methodFilter
        ? `${API_URL}/api/tenants/${tenantId}/gym/checkins?method=${methodFilter}`
        : `${API_URL}/api/tenants/${tenantId}/gym/checkins`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load check-ins");
      return data.data as CheckInFeed;
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });
}

// ---- Helpers ----

const METHOD_ICON: Record<string, React.ElementType> = {
  qr: QrCode,
  face: SmilePlus,
  manual: Hand,
};

const METHOD_STYLE: Record<string, string> = {
  qr: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  face: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  manual: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const ACCESS_STYLE: Record<string, string> = {
  granted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatRelativeTime(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoString).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name: string) {
  return (name?.[0] ?? "?").toUpperCase();
}

// ---- Filter options ----

const FILTER_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: "All Methods" },
  { value: "qr", label: "QR Code" },
  { value: "face", label: "Face" },
  { value: "manual", label: "Manual" },
];

// ---- Page ----

export default function GymCheckInsPage() {
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const { data, isLoading } = useGymCheckIns(methodFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Check-in Feed
            </h1>
            <p className="text-sm text-white/50">
              Live check-in activity (auto-refreshes every 5s)
            </p>
          </div>
        </div>
      </div>

      {/* Today's Total Stat */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Total</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-8 w-20" />
              ) : (
                <p className="mt-1 text-3xl font-bold text-glow">
                  {data?.todayTotal ?? 0}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Check-ins today
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <ScanLine className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-white/40" />
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setMethodFilter(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                methodFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-white/50 hover:text-white",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <Card className="glass-card">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                    <Skeleton className="h-3 w-24 bg-white/[0.06]" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
                  <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
                  <Skeleton className="h-4 w-12 bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : (data?.checkIns?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-white/[0.04] p-3 mb-3">
                <Clock className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">
                No check-ins yet
              </p>
              <p className="text-xs text-white/30 mt-1">
                Check-ins will appear here in real time as members enter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data!.checkIns.map((ci) => {
                const MethodIcon = METHOD_ICON[ci.method] ?? ScanLine;
                return (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={ci.memberPhotoUrl ?? undefined}
                        alt={ci.memberName}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {getInitial(ci.memberName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ci.memberName}
                      </p>
                      {ci.membershipPlan && (
                        <p className="text-xs text-white/40 truncate">
                          {ci.membershipPlan}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs shrink-0",
                        METHOD_STYLE[ci.method] ?? METHOD_STYLE.manual,
                      )}
                    >
                      <MethodIcon className="h-3 w-3" />
                      {ci.method}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        ACCESS_STYLE[ci.status] ?? ACCESS_STYLE.denied,
                      )}
                    >
                      {ci.status}
                    </Badge>

                    <span className="text-xs text-white/40 shrink-0 w-16 text-right">
                      {formatRelativeTime(ci.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
