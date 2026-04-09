"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useMemberships,
  useMyMembershipSubscriptions,
  useMyPaymentRequests,
  useSessionCredits,
} from "@timeo/api-client";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { Calendar, Clock3, CreditCard, History, Package, WalletCards } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant-id";
import { MembershipCard } from "@/member/membership-card";

type SubscriptionRow = {
  subscription?: {
    status?: string;
    currentPeriodStart?: string;
    current_period_start?: string;
    currentPeriodEnd?: string;
    current_period_end?: string;
  };
  plan?: {
    name?: string | null;
    price?: number | null;
  };
};

function getSubscriptionStartDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodStart ?? row?.subscription?.current_period_start ?? null;
}

function getSubscriptionEndDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodEnd ?? row?.subscription?.current_period_end ?? null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function SessionCreditRing({ total, used, remaining }: { total: number; used: number; remaining: number }) {
  const progress = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const size = 124;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="relative h-[124px] w-[124px]">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(16,185,129)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            fill="none"
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-bold text-white">{remaining}</p>
          <p className="text-[11px] uppercase tracking-widest text-white/45">Remaining</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">Session Credits</p>
        <p className="text-xs text-white/60">
          {used} used out of {total} credits
        </p>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const { tenantId } = useTenantId();
  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useMyMembershipSubscriptions(tenantId);
  const { data: sessionCredits = [], isLoading: creditsLoading } = useSessionCredits(tenantId);
  const { data: paymentRequests = [], isLoading: paymentsLoading } = useMyPaymentRequests(tenantId);
  const { data: plans = [], isLoading: plansLoading } = useMemberships(tenantId);

  if (!tenantId) {
    return null;
  }

  const sortedSubscriptions = [...(subscriptions as SubscriptionRow[])].sort((left, right) => {
    const leftDate = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
    const rightDate = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
    return rightDate - leftDate;
  });

  const latestSubscription = sortedSubscriptions[0] ?? null;
  const periodStart = getSubscriptionStartDate(latestSubscription);
  const periodEnd = getSubscriptionEndDate(latestSubscription);
  const planName = latestSubscription?.plan?.name ?? "No active plan";

  const daysRemaining = useMemo(() => {
    if (!periodEnd) return null;
    const dayMs = 86_400_000;
    return Math.ceil((new Date(periodEnd).getTime() - Date.now()) / dayMs);
  }, [periodEnd]);

  const totalSessions = sessionCredits.reduce((total, credit) => total + Math.max(0, credit.totalSessions ?? 0), 0);
  const usedSessions = sessionCredits.reduce((total, credit) => total + Math.max(0, credit.usedSessions ?? 0), 0);
  const remainingSessions = sessionCredits.reduce((total, credit) => total + Math.max(0, credit.remaining ?? 0), 0);

  const activePlans = plans.filter((plan) => {
    if (plan.isActive !== undefined) {
      return plan.isActive;
    }

    if (plan.is_active !== undefined) {
      return plan.is_active;
    }

    return true;
  });

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-white">My Plan</h1>
        <p className="mt-1 text-sm text-white/55">Track your membership, credits, and renewals.</p>
      </div>

      <MembershipCard
        memberName="Membership"
        planName={planName}
        daysRemaining={daysRemaining}
        periodStart={periodStart}
        periodEnd={periodEnd}
        isLoading={subscriptionsLoading}
      />

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <WalletCards className="h-4 w-4 text-white/65" />
            Plan Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-10 rounded-xl bg-white/[0.06]" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/45">Plan Name</p>
                  <p className="mt-1 text-sm font-semibold text-white">{planName}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/45">Status</p>
                  <Badge className="mt-1 rounded-full border-white/[0.12] bg-white/[0.07] text-white/80">
                    {latestSubscription?.subscription?.status ?? "pending"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-white/45">
                    <Calendar className="h-3.5 w-3.5" /> Start Date
                  </p>
                  <p className="mt-1 text-sm text-white">{formatDate(periodStart)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-white/45">
                    <Clock3 className="h-3.5 w-3.5" /> End Date
                  </p>
                  <p className="mt-1 text-sm text-white">{formatDate(periodEnd)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                {daysRemaining === null
                  ? "Your plan status will appear once subscribed."
                  : `${Math.max(daysRemaining, 0)} day${daysRemaining === 1 ? "" : "s"} remaining`}
              </div>

              <Link
                href="/portal/packages"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-black transition-colors hover:bg-emerald-500/90"
              >
                Renew / Top-up
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <CreditCard className="h-4 w-4 text-white/65" />
            Session Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditsLoading ? (
            <Skeleton className="h-40 rounded-2xl bg-white/[0.06]" />
          ) : totalSessions > 0 ? (
            <SessionCreditRing total={totalSessions} used={usedSessions} remaining={remainingSessions} />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center">
              <p className="text-sm text-white/70">No session package yet</p>
              <p className="mt-1 text-xs text-white/45">Top up credits to start booking classes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <History className="h-4 w-4 text-white/65" />
            Payment History
          </h2>
          <Link href="/portal/transactions" className="text-xs font-medium text-emerald-300 hover:text-emerald-200">
            Full history
          </Link>
        </div>

        <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
          <CardContent className="space-y-2 p-4">
            {paymentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-14 rounded-xl bg-white/[0.06]" />
                ))}
              </div>
            ) : paymentRequests.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                No payments yet.
              </div>
            ) : (
              paymentRequests.slice(0, 6).map((payment) => (
                <div key={payment.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{payment.planName}</p>
                    <Badge
                      className={cn(
                        "rounded-full border px-2 py-0 text-[11px]",
                        payment.status === "approved" && "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
                        payment.status === "pending_verification" &&
                          "border-amber-500/40 bg-amber-500/20 text-amber-300",
                        payment.status === "rejected" && "border-red-500/40 bg-red-500/20 text-red-300"
                      )}
                    >
                      {payment.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/55">
                    <span>{new Date(payment.createdAt).toLocaleDateString("en-MY")}</span>
                    <span>{formatMoney(payment.amount, payment.currency)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Package className="h-4 w-4 text-white/65" />
          Available Plans
        </h2>

        <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
          <CardContent className="space-y-3 p-4">
            {plansLoading ? (
              <div className="space-y-2">
                {[1, 2].map((key) => (
                  <Skeleton key={key} className="h-16 rounded-xl bg-white/[0.06]" />
                ))}
              </div>
            ) : activePlans.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                No plans published yet.
              </div>
            ) : (
              activePlans.slice(0, 4).map((plan) => (
                <Link key={plan.id} href="/portal/packages" className="block">
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{plan.name}</p>
                        <p className="truncate text-xs text-white/50">{plan.description ?? "Membership package"}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-emerald-300">{formatMoney(plan.price, plan.currency)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
