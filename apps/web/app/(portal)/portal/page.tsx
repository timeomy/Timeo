"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useGenerateQrCode,
  useMemberQrCode,
  useMyBookings,
  useMyCheckInHistory,
  useMyMembershipSubscriptions,
  useSessionCredits,
  useTenant,
} from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Calendar,
  CheckCircle2,
  DoorOpen,
  MessageCircle,
  QrCode,
  Receipt,
  RefreshCw,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant-id";
import { MembershipCard } from "@/member/membership-card";
import { QuickActions, type QuickActionItem } from "@/member/quick-actions";
import { MemberQrModal } from "@/member/qr-modal";

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
  };
};

type TimelineItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  kind: "check-in" | "class";
};

function getSubscriptionStartDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodStart ?? row?.subscription?.current_period_start ?? null;
}

function getSubscriptionEndDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodEnd ?? row?.subscription?.current_period_end ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value: string) {
  const date = new Date(value).getTime();
  const diffMinutes = Math.floor((Date.now() - date) / 60000);

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatCheckInMethod(method?: string) {
  if (!method) return "Unknown";

  if (method === "nfc") return "Card";
  return method.toUpperCase();
}

function EmptyTenantState({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-4 pt-4">
      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardContent className="p-5">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Sparkles className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome, {firstName} 👋</h1>
          <p className="mt-2 text-sm text-white/60">Join a gym to unlock check-ins, plans, and your member dashboard.</p>
        </CardContent>
      </Card>

      <Link href="/join" className="block">
        <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 transition-colors hover:bg-emerald-500/15">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-emerald-200">I have an invite code</p>
            <p className="mt-1 text-xs text-emerald-100/70">Join your gym in one step</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/portal/directory" className="block">
        <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03] transition-colors hover:bg-white/[0.06]">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-white">Browse gyms</p>
            <p className="mt-1 text-xs text-white/55">Find a gym near you</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export default function PortalHomePage() {
  const router = useRouter();
  const { user } = useTimeoWebAuthContext();
  const { tenantId } = useTenantId();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const { data: tenantData } = useTenant(tenantId);
  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useMyMembershipSubscriptions(tenantId);
  const { data: sessionCredits = [] } = useSessionCredits(tenantId);
  const { data: checkInHistory, isLoading: checkInsLoading } = useMyCheckInHistory(tenantId, {
    page: 1,
    limit: 5,
  });
  const { data: myBookings = [], isLoading: bookingsLoading } = useMyBookings(tenantId);
  const { data: qrCode } = useMemberQrCode(tenantId);
  const qrMutation = useGenerateQrCode(tenantId ?? "");

  const firstName = user?.name?.split(" ")[0] ?? "Member";
  const displayName = user?.name ?? user?.email ?? "Member";
  const memberBadgeId = user?.id?.slice(0, 8).toUpperCase() ?? "MEMBER";

  if (!tenantId) {
    return <EmptyTenantState firstName={firstName} />;
  }

  const tenantName = tenantData?.name ?? "Your Gym";
  const sortedSubscriptions = [...(subscriptions as SubscriptionRow[])].sort((left, right) => {
    const leftDate = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
    const rightDate = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
    return rightDate - leftDate;
  });
  const latestSubscription = sortedSubscriptions[0] ?? null;
  const periodStart = getSubscriptionStartDate(latestSubscription);
  const periodEnd = getSubscriptionEndDate(latestSubscription);
  const planName = latestSubscription?.plan?.name ?? null;

  const daysRemaining = useMemo(() => {
    if (!periodEnd) return null;
    const dayMs = 86_400_000;
    return Math.ceil((new Date(periodEnd).getTime() - Date.now()) / dayMs);
  }, [periodEnd]);

  const sessionBalance = useMemo(() => {
    return sessionCredits.reduce((total, credit) => total + Math.max(0, credit.remaining ?? 0), 0);
  }, [sessionCredits]);

  const recentTimeline = useMemo<TimelineItem[]>(() => {
    const checkIns = (checkInHistory?.items ?? []).map((item) => ({
      id: `check-in-${item.id}`,
      kind: "check-in" as const,
      timestamp: item.checkedInAt,
      title: "Gym check-in",
      detail: `${formatCheckInMethod(item.method)} scan • ${formatDateTime(item.checkedInAt)}`,
    }));

    const classes = myBookings.map((booking) => {
      const isUpcoming = new Date(booking.startTime).getTime() > Date.now();
      const title = isUpcoming ? "Class booking" : booking.status === "completed" ? "Class attended" : "Booking update";

      return {
        id: `booking-${booking.id}`,
        kind: "class" as const,
        timestamp: booking.startTime,
        title,
        detail: `${booking.serviceName ?? "Class"} • ${formatDateTime(booking.startTime)}`,
      };
    });

    return [...checkIns, ...classes]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 5);
  }, [checkInHistory?.items, myBookings]);

  async function handleOpenQr() {
    if (!tenantId) return;

    if (!qrCode?.code) {
      try {
        await qrMutation.mutateAsync({ tenantId });
      } catch {
        // Silent fail keeps the modal fallback state.
      }
    }

    setIsQrOpen(true);
  }

  async function handleReferFriend() {
    const shareText = `Join me at ${tenantName} on Timeo!`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Join my gym", text: shareText });
        return;
      } catch {
        // User canceled share, fallback to clipboard.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
  }

  const quickActions: QuickActionItem[] = [
    {
      id: "qr",
      label: "My QR Code",
      subtitle: "Open scanner",
      icon: QrCode,
      onClick: handleOpenQr,
      tone: "emerald",
    },
    {
      id: "book",
      label: "Book a Class",
      subtitle: "Reserve now",
      icon: Calendar,
      href: "/portal/bookings/new",
      tone: "sky",
    },
    {
      id: "sessions",
      label: "My Sessions",
      subtitle: `${sessionBalance} credit${sessionBalance === 1 ? "" : "s"}`,
      icon: Wallet,
      href: "/portal/plan",
      tone: "violet",
    },
    {
      id: "payments",
      label: "Payment History",
      subtitle: "Receipts",
      icon: Receipt,
      href: "/portal/transactions",
      tone: "amber",
    },
    {
      id: "coach",
      label: "Contact Coach",
      subtitle: "Support",
      icon: MessageCircle,
      href: "/portal/profile",
      tone: "indigo",
    },
    {
      id: "refer",
      label: "Refer a Friend",
      subtitle: "Share invite",
      icon: UserPlus,
      onClick: handleReferFriend,
      tone: "rose",
    },
  ];

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (typeof window === "undefined" || window.scrollY > 0) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartYRef.current === null) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
    const delta = currentY - touchStartYRef.current;

    if (delta > 0) {
      setPullDistance(Math.min(100, delta * 0.55));
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= 72) {
      setIsPullRefreshing(true);
      router.refresh();
      window.setTimeout(() => setIsPullRefreshing(false), 700);
    }

    setPullDistance(0);
    touchStartYRef.current = null;
  }

  const isTimelineLoading = checkInsLoading || bookingsLoading;

  return (
    <div
      className="space-y-5 pb-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex justify-center overflow-hidden transition-all"
        style={{ height: pullDistance > 0 || isPullRefreshing ? 32 : 0 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs text-white/65">
          <RefreshCw className={cn("h-3.5 w-3.5", (isPullRefreshing || pullDistance > 72) && "animate-spin")} />
          {pullDistance > 72 ? "Release to refresh" : "Pull down to refresh"}
        </div>
      </div>

      <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-12 w-12 border border-white/20">
                {user?.imageUrl ? <AvatarImage src={user.imageUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-white/10 text-sm text-white">{getInitials(displayName)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">Welcome back</p>
                <h1 className="truncate text-xl font-bold text-white">{firstName}</h1>
                <p className="truncate text-sm text-white/70">{tenantName}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenQr}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/15"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            Everything important in two taps
          </div>
        </CardContent>
      </Card>

      <MembershipCard
        memberName={displayName}
        planName={planName}
        daysRemaining={daysRemaining}
        periodStart={periodStart}
        periodEnd={periodEnd}
        isLoading={subscriptionsLoading}
        onRenew={() => router.push("/portal/packages")}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Quick Actions</h2>
          <Badge className="rounded-full border-white/[0.12] bg-white/[0.05] text-white/70">One tap</Badge>
        </div>
        <QuickActions actions={quickActions} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Recent Activity</h2>
          <Link href="/portal/activity" className="text-xs font-medium text-emerald-300 hover:text-emerald-200">
            View all
          </Link>
        </div>

        <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4">
            {isTimelineLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-12 rounded-xl bg-white/[0.06]" />
                ))}
              </div>
            ) : recentTimeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <DoorOpen className="h-8 w-8 text-white/20" />
                <p className="text-sm font-medium text-white/70">No activity yet</p>
                <p className="text-xs text-white/45">Your check-ins and class visits will appear here.</p>
                <Button
                  type="button"
                  onClick={() => router.push("/portal/bookings/new")}
                  className="mt-2 h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-black hover:bg-emerald-500/90"
                >
                  Book first class
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTimeline.map((item, index) => (
                  <div key={item.id} className="relative flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex w-8 flex-col items-center">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
                          item.kind === "check-in" ? "bg-emerald-500/20" : "bg-sky-500/20"
                        )}
                      >
                        {item.kind === "check-in" ? (
                          <DoorOpen className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-sky-300" />
                        )}
                      </span>
                      {index !== recentTimeline.length - 1 ? <span className="mt-1 h-full w-px bg-white/[0.08]" /> : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-white/55">{item.detail}</p>
                    </div>

                    <div className="shrink-0 text-[11px] text-white/45">{formatRelative(item.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <MemberQrModal
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        qrCode={qrCode?.code}
        memberName={displayName}
        memberId={memberBadgeId}
        regenerating={qrMutation.isPending}
        onRegenerate={
          tenantId
            ? () => {
                void qrMutation.mutateAsync({ tenantId });
              }
            : undefined
        }
      />
    </div>
  );
}
