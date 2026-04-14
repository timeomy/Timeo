"use client";

import { useState, useEffect, useRef } from "react";
import {
  useMemberQrCode,
  useGenerateQrCode,
  useSessionCredits,
  useTenant,
  useTenantBroadcasts,
  useServiceCatalog,
} from "@timeo/api-client";
import type { Broadcast, ServiceCatalogItem } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useTenantId } from "@/hooks/use-tenant-id";
import { Card, CardContent, Skeleton, cn } from "@timeo/ui/web";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  RefreshCw,
  Dumbbell,
  User,
  ChevronDown,
  ChevronUp,
  Zap,
  KeyRound,
  Search,
  Calendar,
  ShoppingBag,
  Megaphone,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";

// ─── Training type badge colours ─────────────────────────────────────────────
const TRAINING_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PUSH: { bg: "bg-orange-500/20", text: "text-orange-300", label: "Push" },
  PULL: { bg: "bg-blue-500/20", text: "text-blue-300", label: "Pull" },
  LEGS: { bg: "bg-green-500/20", text: "text-green-300", label: "Legs" },
  UPPER: { bg: "bg-purple-500/20", text: "text-purple-300", label: "Upper" },
  LOWER: { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "Lower" },
  CARDIO: { bg: "bg-pink-500/20", text: "text-pink-300", label: "Cardio" },
  FULL_BODY: { bg: "bg-cyan-500/20", text: "text-cyan-300", label: "Full Body" },
};

function getBadge(type: string) {
  const key = type.toUpperCase().replace(/ /g, "_");
  return TRAINING_BADGE[key] ?? { bg: "bg-white/10", text: "text-white/60", label: type };
}

// ─── Broadcast type config ────────────────────────────────────────────────────
const BROADCAST_CONFIG = {
  promotion: { bg: "from-amber-600/80 to-orange-700/80", badge: "bg-amber-500", label: "Promo" },
  announcement: { bg: "from-blue-600/80 to-blue-800/80", badge: "bg-blue-500", label: "News" },
  event: { bg: "from-purple-600/80 to-indigo-700/80", badge: "bg-purple-500", label: "Event" },
  new_service: { bg: "from-emerald-600/80 to-teal-700/80", badge: "bg-emerald-500", label: "New" },
};

// ─── No Tenant Onboarding ─────────────────────────────────────────────────────
function NoTenantOnboarding({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">Welcome, {firstName}! 👋</h1>
        <p className="mx-auto mt-3 max-w-sm text-lg text-white/60">
          You&apos;re not linked to a gym yet. Join your gym to get started.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <Link href="/join">
          <div className="flex items-center gap-4 rounded-2xl bg-primary/10 border border-primary/20 p-5 hover:bg-primary/20 transition-colors">
            <div className="rounded-xl bg-primary/20 p-3">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">I Have a Code</p>
              <p className="text-sm text-white/50">Enter your gym&apos;s invite code</p>
            </div>
          </div>
        </Link>
        <Link href="/portal/directory">
          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:bg-white/[0.08] transition-colors">
            <div className="rounded-xl bg-white/10 p-3">
              <Search className="h-7 w-7 text-white/60" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Find a Business</p>
              <p className="text-sm text-white/50">Browse our directory</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Broadcast Carousel ───────────────────────────────────────────────────────
function BroadcastCarousel({ broadcasts, tenantName }: { broadcasts: Broadcast[]; tenantName: string }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % broadcasts.length);
    }, 5000);
  };

  useEffect(() => {
    if (broadcasts.length > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [broadcasts.length]);

  const goTo = (idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(idx);
    startTimer();
  };

  if (broadcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-2xl bg-white/[0.04] border border-white/[0.08] gap-3">
        <Megaphone className="h-8 w-8 text-white/20" />
        <p className="text-sm text-white/40">No broadcasts yet</p>
      </div>
    );
  }

  const bc = broadcasts[current];
  const cfg = BROADCAST_CONFIG[bc.type as keyof typeof BROADCAST_CONFIG] ?? BROADCAST_CONFIG.announcement;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ minHeight: 200 }}>
      {/* Background */}
      {bc.imageUrl ? (
        <div className="absolute inset-0">
          <img
            src={bc.imageUrl}
            alt={bc.title ?? ""}
            className="h-full w-full object-cover"
          />
          <div className={cn("absolute inset-0 bg-gradient-to-t", cfg.bg)} />
        </div>
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br", cfg.bg)} />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5" style={{ minHeight: 200 }}>
        <div className="flex items-start justify-between">
          {/* Type badge */}
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold text-white", cfg.badge)}>
            {cfg.label}
          </span>
          {/* Gym badge */}
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {tenantName}
          </span>
        </div>

        <div className="mt-auto">
          {bc.title && (
            <h3 className="text-xl font-bold text-white leading-tight drop-shadow">
              {bc.title}
            </h3>
          )}
          {bc.content && (
            <p className="mt-1.5 text-sm text-white/80 line-clamp-2 drop-shadow">
              {bc.content}
            </p>
          )}
        </div>
      </div>

      {/* Nav arrows */}
      {broadcasts.length > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + broadcasts.length) % broadcasts.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/40 p-1.5 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => goTo((current + 1) % broadcasts.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/40 p-1.5 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {broadcasts.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
          {broadcasts.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all",
                i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Service Catalog Grid ─────────────────────────────────────────────────────
function ServiceCatalogGrid({ tenantId }: { tenantId: string }) {
  const { data: items, isLoading } = useServiceCatalog(tenantId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
        <ShoppingBag className="h-8 w-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">No services listed yet</p>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(price / 100);

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item: ServiceCatalogItem) => (
        <Link key={item.id} href={`/portal/bookings/new?serviceId=${item.id}`}>
          <div
            className="relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 hover:bg-white/[0.07] hover:border-primary/30 transition-all cursor-pointer"
          >
            {item.category && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                {item.category}
              </span>
            )}
            <p className="mt-1 text-sm font-semibold text-white leading-tight line-clamp-2">
              {item.name}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-base font-bold text-primary">{formatPrice(item.price)}</span>
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="h-3 w-3" />
                {item.durationMinutes}m
              </span>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary w-full justify-center">
                Book Now
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── QR Section ───────────────────────────────────────────────────────────────
function QrSection({ tenantId }: { tenantId: string }) {
  const { data: qrCode, isLoading } = useMemberQrCode(tenantId);
  const { mutateAsync: generateQrCode } = useGenerateQrCode(tenantId);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          generateQrCode({ tenantId }).catch(() => {});
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [generateQrCode, tenantId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateQrCode({ tenantId });
      setCountdown(30);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  function handlePrintQr() {
    const svgEl = document.querySelector(".qr-print-target svg") as SVGElement | null;
    if (!svgEl || !qrCode) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgDataUrl = "data:image/svg+xml;base64," + btoa(svgString);
    const code = qrCode.code;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = [
      "<!DOCTYPE html><html><head><title>QR Code</title>",
      "<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}",
      ".card{text-align:center;padding:40px;border:2px solid #e5e7eb;border-radius:16px;max-width:300px}",
      ".code{font-family:monospace;font-size:13px;color:#374151;background:#f3f4f6;padding:8px 16px;border-radius:8px;letter-spacing:2px;display:inline-block;margin-top:16px}",
      ".footer{font-size:11px;color:#9ca3af;margin-top:12px}</style></head>",
      "<body><div class='card'>",
      "<img src='" + svgDataUrl + "' width='200' height='200' />",
      "<p class='code'>" + code + "</p>",
      "<p class='footer'>Show this QR code to check in</p>",
      "</div><script>window.onload=function(){window.print()}<\/script></body></html>",
    ].join("");
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Skeleton className="h-64 w-64 rounded-3xl bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {qrCode ? (
        <>
          <div className="relative">
            <div className="absolute -inset-2 rounded-3xl bg-emerald-500/30 animate-pulse" />
            <div className="relative rounded-2xl bg-white p-5 shadow-2xl qr-print-target">
              <QRCodeSVG value={qrCode.code} size={200} level="H" fgColor="#111" bgColor="#fff" />
            </div>
          </div>
          <p className="text-center text-base font-medium text-white/70">
            Show this at the front desk to check in
          </p>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refreshes in {countdown}s</span>
          </div>
          <button
            onClick={handlePrintQr}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <span>&#128424;</span> Print QR Code
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-white/[0.06] p-8">
            <QrCode className="h-14 w-14 text-white/30" />
          </div>
          <p className="text-base text-white/60">No QR code yet</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            <QrCode className="h-5 w-5" />
            {generating ? "Generating..." : "Get My QR Code"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Membership Card ──────────────────────────────────────────────────────────
function MembershipSection({ tenantId }: { tenantId: string }) {
  const { data: credits, isLoading } = useSessionCredits(tenantId);

  if (isLoading) return <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.06]" />;

  if (!credits || credits.length === 0) {
    return (
      <Link href="/portal/packages">
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.07] transition-colors">
          <div>
            <p className="text-base font-semibold text-white">No active package</p>
            <p className="text-sm text-white/40 mt-0.5">Browse packages to get started</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/30" />
        </div>
      </Link>
    );
  }

  // SessionCredit has direct fields: totalSessions, usedSessions, remaining, expiresAt, packageName
  const credit = credits[0] as {
    id: string;
    totalSessions: number;
    usedSessions: number;
    remaining: number;
    expiresAt?: string;
    packageName?: string;
  };
  const packageName = credit.packageName ?? "Your Package";
  const total = credit.totalSessions ?? 0;
  const remaining = credit.remaining ?? (total - (credit.usedSessions ?? 0));
  const expiresAt = credit.expiresAt;
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const barColor = pct > 40 ? "bg-emerald-500" : pct > 15 ? "bg-amber-400" : "bg-red-500";

  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-white/50 mb-1">{packageName}</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-extrabold text-white">{remaining}</span>
          <span className="text-lg text-white/50 pb-0.5">sessions left</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mb-2">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
        {expiresAt && (
          <p className="text-xs text-white/40 mt-1.5">
            Expires {new Date(expiresAt).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Training History ─────────────────────────────────────────────────────────
function TrainingLogCard({ log }: { log: { id: string; date: string; notes?: string | null; trainingTypes?: string[]; exercises?: Array<{ name: string; sets?: number; reps?: number; weight?: number }> } }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(log.date).toLocaleDateString("en-MY", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={() => setExpanded((e) => !e)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-base font-semibold text-white">{dateStr}</p>
              {log.trainingTypes && log.trainingTypes.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {log.trainingTypes.map((t) => {
                    const badge = getBadge(t);
                    return (
                      <span key={t} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {expanded ? <ChevronUp className="h-5 w-5 text-white/30 mt-0.5 shrink-0" /> : <ChevronDown className="h-5 w-5 text-white/30 mt-0.5 shrink-0" />}
          </div>
        </button>
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {log.exercises && log.exercises.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Exercises</p>
                <div className="space-y-1.5">
                  {log.exercises!.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-white">{ex.name}</span>
                      <span className="text-xs text-white/40">
                        {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && `${ex.weight}kg`].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {log.notes && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs font-medium text-white/40 mb-1">Coach&apos;s Note</p>
                <p className="text-sm text-white/80">{log.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrainingSection({ tenantId }: { tenantId: string }) {
  // TODO: Implement useMyTrainingLogs hook
  const isLoading = false;
  const logs: any[] = [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/[0.06]" />)}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-6 text-center">
          <Dumbbell className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">No training sessions yet</p>
          <p className="text-xs text-white/30 mt-1">Your coach will log your sessions here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {logs.slice(0, 3).map((log) => (
        <TrainingLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}

// ─── Coach Section ────────────────────────────────────────────────────────────
function CoachSection({ tenantId }: { tenantId: string }) {
  // TODO: Implement useMyCoach hook
  const isLoading = false;
  const coach: any = null;
  if (isLoading) {
    return (
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-white/[0.08]" />
              <div className="h-4 w-32 rounded bg-white/[0.08]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!coach) return null;

  const initials = coach.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="glass border-white/[0.08] overflow-hidden">
      {/* Subtle gradient accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-purple-500/60 to-blue-500/60" />
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {coach.avatarUrl ? (
              <img
                src={coach.avatarUrl}
                alt={coach.name}
                className="h-14 w-14 rounded-xl object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/20 text-lg font-bold text-primary border-2 border-primary/20">
                {initials}
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0d1117]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">
              Your Personal Trainer
            </p>
            <p className="text-base font-bold text-white leading-tight">{coach.name}</p>
            {coach.email && (
              <p className="text-xs text-white/40 mt-0.5 truncate">{coach.email}</p>
            )}
            {/* Specialty badges */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Strength", "Conditioning", "Nutrition"].map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/50"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Badge */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Dumbbell className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab Content ──────────────────────────────────────────────────────────────
type Tab = "broadcasts" | "catalog" | "vouchers" | "qr";

// ─── Gym Header ───────────────────────────────────────────────────────────────
type TenantData = {
  name?: string;
  logoUrl?: string;
  branding?: { logoUrl?: string; primaryColor?: string; [key: string]: unknown };
};

function GymHeader({
  tenantData,
  tenantLoading,
  firstName,
}: {
  tenantData: TenantData | undefined;
  tenantLoading: boolean;
  firstName: string;
}) {
  const logoUrl = tenantData?.logoUrl ?? tenantData?.branding?.logoUrl ?? null;
  const gymName = tenantData?.name ?? "Your Gym";

  return (
    <div className="flex items-center gap-4 py-2">
      {/* Logo circle */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/[0.1] overflow-hidden">
        {tenantLoading ? (
          <Skeleton className="h-14 w-14 rounded-2xl bg-white/[0.06]" />
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt={gymName}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Dumbbell className="h-7 w-7 text-primary" />
        )}
      </div>
      {/* Name + greeting */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest truncate">
          {tenantLoading ? <span className="inline-block w-24 h-3 bg-white/[0.08] rounded animate-pulse" /> : gymName}
        </p>
        <h1 className="text-xl font-extrabold text-white leading-tight">
          Hey, {firstName}! 👋
        </h1>
      </div>
      {/* Sparkles badge */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

// ─── Main Tenant Dashboard ────────────────────────────────────────────────────
function TenantDashboard({ tenantId, firstName }: { tenantId: string; firstName: string }) {
  const { data: tenantData, isLoading: tenantLoading } = useTenant(tenantId);
  const { data: broadcasts, isLoading: broadcastsLoading } = useTenantBroadcasts(tenantId);
  const [activeTab, setActiveTab] = useState<Tab>("broadcasts");

  const gymName = (tenantData as TenantData | undefined)?.name ?? "Your Gym";

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "broadcasts", label: "Feed", icon: Megaphone },
    { id: "catalog", label: "Catalog", icon: Tag },
    { id: "vouchers", label: "Vouchers", icon: ShoppingBag },
    { id: "qr", label: "My QR", icon: QrCode },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Gym Header */}
      <GymHeader
        tenantData={tenantData as TenantData | undefined}
        tenantLoading={tenantLoading}
        firstName={firstName}
      />

      {/* 2. Category Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content */}
      {activeTab === "broadcasts" && (
        <div className="space-y-5">
          {/* Broadcast Carousel */}
          <div>
            {broadcastsLoading ? (
              <Skeleton className="h-52 w-full rounded-2xl bg-white/[0.06]" />
            ) : (
              <BroadcastCarousel
                broadcasts={broadcasts ?? []}
                tenantName={gymName}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/portal/bookings">
              <div className="flex flex-col gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-4 hover:bg-primary/20 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Book Session</p>
                  <p className="text-xs text-white/50">Schedule now</p>
                </div>
              </div>
            </Link>
            <Link href="/portal/packages">
              <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 hover:bg-white/[0.08] transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08]">
                  <ShoppingBag className="h-5 w-5 text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Packages</p>
                  <p className="text-xs text-white/50">Browse plans</p>
                </div>
              </div>
            </Link>
          </div>

          {/* My Package */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">My Package</h2>
              <Link href="/portal/packages" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <MembershipSection tenantId={tenantId} />
          </div>

          {/* Training History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Training History</h2>
            </div>
            <TrainingSection tenantId={tenantId} />
          </div>

          {/* My Coach */}
          <CoachSection tenantId={tenantId} />
        </div>
      )}

      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Services</h2>
              <p className="text-sm text-white/40">What {gymName} offers</p>
            </div>
          </div>
          <ServiceCatalogGrid tenantId={tenantId} />
        </div>
      )}

      {activeTab === "vouchers" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Vouchers & Promotions</h2>
          <Link href="/portal/vouchers">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.07] transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                  <Tag className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">My Vouchers</p>
                  <p className="text-sm text-white/40">View your vouchers &amp; gift cards</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/30" />
            </div>
          </Link>
        </div>
      )}

      {activeTab === "qr" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">My Check-in QR</h2>
            <p className="text-sm text-white/40 mt-1">Show this to check in at the gym</p>
          </div>
          <Card className="glass border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-8">
              <QrSection tenantId={tenantId} />
              {/* Member identity below QR */}
              <div className="mt-6 text-center border-t border-white/[0.06] pt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">Member</p>
                <p className="text-xl font-bold text-white">{firstName}</p>
                <p className="text-sm text-white/40 mt-0.5">{gymName}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function PortalHomePage() {
  const { user } = useTimeoWebAuthContext();
  const { tenantId } = useTenantId();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (!tenantId) {
    return <NoTenantOnboarding firstName={firstName} />;
  }

  return <TenantDashboard tenantId={tenantId} firstName={firstName} />;
}
