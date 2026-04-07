"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Select,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Mail,
  Phone,
  QrCode,
  SmilePlus,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  UserCog,
  Package,
  CalendarDays,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types (matches actual API response) ----

type MemberDetailRaw = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  membership: {
    id: string;
    role: string;
    status: "active" | "expired" | "suspended" | "inactive";
    notes: string | null;
    tags: string[];
    joinedAt: string;
    coachId: string | null;
  } | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    planName?: string;
  } | null;
  sessionCredit?: {
    id: string;
    totalSessions: number;
    usedSessions: number;
    remainingClasses: number;
    expiresAt: string | null;
    packageName: string | null;
  } | null;
  faceRegistration: {
    registered: boolean;
    registrations: Array<{ id: string; status: string }>;
  };
  recentCheckIns: Array<{
    id: string;
    method: string;
    timestamp: string;
  }>;
  qrCode?: {
    code: string;
  } | null;
};

type CoachOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// ---- Helpers ----

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  inactive: "bg-white/10 text-white/40 border-white/20",
};

const METHOD_BADGE: Record<string, string> = {
  qr: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  face: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  manual: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  nfc: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name: string | null, email: string | null) {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

// ---- Hooks ----

function useMemberDetail(memberId: string) {
  const { tenantId } = useTenantId();
  return useQuery<MemberDetailRaw>({
    queryKey: ["gym", tenantId, "member-detail", memberId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members/${memberId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Member not found");
      return data.data as MemberDetailRaw;
    },
    enabled: !!tenantId && !!memberId,
  });
}

function useCoaches() {
  const { tenantId } = useTenantId();
  return useQuery<CoachOption[]>({
    queryKey: ["coaches", tenantId, "list"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) return [];
      return data.data as CoachOption[];
    },
    enabled: !!tenantId,
  });
}

function useMemberSessionCredits(memberId: string) {
  const { tenantId } = useTenantId();
  return useQuery({
    queryKey: ["gym", tenantId, "member-credits", memberId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/sessions/credits?userId=${memberId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) return [];
      return data.data;
    },
    enabled: !!tenantId && !!memberId,
  });
}

// ---- Page ----

export default function GymMemberDetailPage() {
  const params = useParams()!;
  const memberId = params.id as string;
  const router = useRouter();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const { data: raw, isLoading } = useMemberDetail(memberId);
  const { data: coaches = [] } = useCoaches();
  const { data: credits = [] } = useMemberSessionCredits(memberId);

  const assignCoach = useMutation({
    mutationFn: async (coachId: string | null) => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches/members/${memberId}/assign-coach`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coachId }),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to assign coach");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym", tenantId, "member-detail", memberId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl bg-white/[0.06] lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl bg-white/[0.06] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!raw) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-white/50">Member not found</p>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => router.push("/dashboard/gym/members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Members
        </Button>
      </div>
    );
  }

  const memberStatus = (raw.membership?.status ?? "inactive") as string;
  const faceEnrolled = raw.faceRegistration?.registered ?? false;
  const coachId = raw.membership?.coachId ?? null;

  // Most recent active session credit
  const activeCredit = credits.find(
    (c: any) => (c.credit?.totalSessions ?? 0) > 0
  );
  const creditData = activeCredit ? {
    total: activeCredit.credit?.totalSessions ?? 0,
    used: activeCredit.credit?.usedSessions ?? 0,
    remaining: (activeCredit.credit?.totalSessions ?? 0) - (activeCredit.credit?.usedSessions ?? 0),
    packageName: activeCredit.package?.name ?? "Session Package",
    expiresAt: activeCredit.credit?.expiresAt ?? null,
  } : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white/50 hover:text-white"
        onClick={() => router.push("/dashboard/gym/members")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Members
      </Button>

      {/* Member Header */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="glass-card lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6">
            <Avatar className="h-24 w-24 mb-4">
              {raw.user.avatarUrl && <AvatarImage src={raw.user.avatarUrl} alt={raw.user.name} />}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {getInitial(raw.user.name, raw.user.email)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-white">{raw.user.name}</h2>
            <div className="mt-3 space-y-2 w-full">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Mail className="h-4 w-4 text-white/30" />
                <span className="truncate">{raw.user.email}</span>
              </div>
            </div>

            {/* Member ID + Join Date */}
            <div className="mt-4 w-full space-y-2 border-t border-white/[0.06] pt-4">
              <div>
                <p className="text-xs text-white/40">Member ID</p>
                <p className="text-sm font-mono text-white/80">{raw.user.id.slice(0, 12)}…</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Joined</p>
                <p className="text-sm text-white/80">
                  {raw.membership?.joinedAt ? formatDate(raw.membership.joinedAt) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Membership Status */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-white/40 mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_BADGE[memberStatus] ?? STATUS_BADGE.inactive)}
                  >
                    {memberStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Role</p>
                  <p className="text-sm text-white">{raw.membership?.role ?? "—"}</p>
                </div>
                {raw.subscription && (
                  <>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Subscription</p>
                      <Badge variant="outline" className={cn("text-xs",
                        raw.subscription.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      )}>
                        {raw.subscription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Period End</p>
                      <p className="text-sm text-white">
                        {formatDate(raw.subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Credits */}
          {creditData && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-primary" />
                  Session Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Package</p>
                    <p className="text-sm text-white">{creditData.packageName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Remaining</p>
                    <p className="text-2xl font-bold text-white">{creditData.remaining}
                      <span className="text-sm text-white/40 font-normal"> / {creditData.total}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Expires</p>
                    <p className="text-sm text-white">
                      {creditData.expiresAt ? formatDate(creditData.expiresAt) : "No expiry"}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        creditData.remaining / creditData.total > 0.5 ? "bg-emerald-500" :
                        creditData.remaining / creditData.total > 0.2 ? "bg-amber-400" : "bg-red-500"
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, (creditData.remaining / creditData.total) * 100))}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Coach */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4 text-primary" />
                Assigned Coach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={[
                  { value: "none", label: "No coach assigned" },
                  ...coaches.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.role})`,
                  })),
                ]}
                value={coachId ?? "none"}
                onChange={(val) => assignCoach.mutate(val === "none" ? null : val)}
              />
              {assignCoach.isPending && (
                <p className="text-xs text-white/40 mt-2">Saving...</p>
              )}
              {assignCoach.isSuccess && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Coach updated
                </p>
              )}
            </CardContent>
          </Card>

          {/* Face Enrollment */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <SmilePlus className="h-4 w-4 text-primary" />
                Face Enrollment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {faceEnrolled ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Enrolled</p>
                        <p className="text-xs text-white/40">Face recognition active</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-white/20" />
                      <div>
                        <p className="text-sm font-medium text-white">Not Enrolled</p>
                        <p className="text-xs text-white/40">Set up face recognition</p>
                      </div>
                    </>
                  )}
                </div>
                <Link href={`/dashboard/gym/turnstile/enroll/${memberId}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SmilePlus className="h-4 w-4" />
                    {faceEnrolled ? "Re-Enroll" : "Enroll"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-in History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Recent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(raw.recentCheckIns?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-white/[0.04] p-3 mb-3">
                <Clock className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">No check-in history</p>
              <p className="text-xs text-white/30 mt-1">
                Check-ins will appear here once the member visits.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Date / Time</TableHead>
                  <TableHead className="text-white/50">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {raw.recentCheckIns.map((ci) => (
                  <TableRow
                    key={ci.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell className="text-sm text-white/70">
                      {formatDateTime(ci.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          METHOD_BADGE[ci.method] ?? METHOD_BADGE.manual,
                        )}
                      >
                        {ci.method}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
