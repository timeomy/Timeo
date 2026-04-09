"use client";

import { Badge, Button, Card, CardContent, Skeleton, cn } from "@timeo/ui/web";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

type MembershipState = "active" | "expiring" | "expired" | "unknown";

interface MembershipCardProps {
  memberName: string;
  planName?: string | null;
  daysRemaining?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  isLoading?: boolean;
  onRenew?: () => void;
  className?: string;
}

function getMembershipState(daysRemaining?: number | null): MembershipState {
  if (daysRemaining === null || daysRemaining === undefined) {
    return "unknown";
  }

  if (daysRemaining <= 0) {
    return "expired";
  }

  if (daysRemaining <= 7) {
    return "expiring";
  }

  return "active";
}

function calcProgress(periodStart?: string | null, periodEnd?: string | null) {
  if (!periodStart || !periodEnd) {
    return 0;
  }

  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  const ratio = (now - start) / (end - start);
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MembershipCard({
  memberName,
  planName,
  daysRemaining,
  periodStart,
  periodEnd,
  isLoading,
  onRenew,
  className,
}: MembershipCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("rounded-2xl border-white/[0.08] bg-white/[0.03]", className)}>
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-5 w-32 rounded-lg bg-white/[0.07]" />
          <Skeleton className="h-8 w-48 rounded-lg bg-white/[0.07]" />
          <Skeleton className="h-2.5 w-full rounded-full bg-white/[0.07]" />
          <Skeleton className="h-4 w-40 rounded-lg bg-white/[0.07]" />
        </CardContent>
      </Card>
    );
  }

  const state = getMembershipState(daysRemaining);
  const consumedProgress = calcProgress(periodStart, periodEnd);
  const safeDays = daysRemaining ?? 0;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-white/[0.08]",
        state === "active" && "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-white/[0.02]",
        state === "expiring" && "bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-white/[0.02]",
        state === "expired" && "bg-gradient-to-br from-red-500/20 via-red-500/5 to-white/[0.02]",
        state === "unknown" && "bg-white/[0.03]",
        className
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              Membership Status
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">{planName ?? "No active plan"}</h2>
            <p className="mt-1 text-sm text-white/65">{memberName}</p>
          </div>

          {state === "active" ? (
            <Badge className="rounded-full border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Active
            </Badge>
          ) : null}
          {state === "expiring" ? (
            <Badge className="rounded-full border-amber-500/40 bg-amber-500/20 text-amber-300">
              <Clock3 className="mr-1 h-3.5 w-3.5" /> Expiring Soon
            </Badge>
          ) : null}
          {state === "expired" ? (
            <Badge className="rounded-full border-red-500/40 bg-red-500/20 text-red-300">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Expired
            </Badge>
          ) : null}
          {state === "unknown" ? (
            <Badge className="rounded-full border-white/[0.12] bg-white/[0.06] text-white/65">Pending</Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/55">Plan period progress</span>
            <span className="font-semibold text-white/85">{consumedProgress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                state === "active" && "bg-emerald-400",
                state === "expiring" && "bg-amber-400",
                state === "expired" && "bg-red-400",
                state === "unknown" && "bg-white/35"
              )}
              style={{ width: `${consumedProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/45">Start</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatDateLabel(periodStart)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/45">End</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatDateLabel(periodEnd)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/75">
            {state === "unknown"
              ? "Waiting for your first subscription."
              : `${Math.max(0, safeDays)} day${safeDays === 1 ? "" : "s"} remaining`}
          </p>

          {(state === "expired" || state === "expiring" || state === "unknown") && onRenew ? (
            <Button
              type="button"
              size="sm"
              onClick={onRenew}
              className={cn(
                "min-h-11 rounded-xl px-4 font-semibold",
                state === "expired" && "bg-red-500 text-white hover:bg-red-500/90",
                state === "expiring" && "bg-amber-500 text-black hover:bg-amber-500/90",
                state === "unknown" && "bg-emerald-500 text-black hover:bg-emerald-500/90"
              )}
            >
              {state === "unknown" ? "Browse Plans" : "Renew Now"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
