"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMemberDetail,
  useResetPlatformUserPassword,
  useUpdateMember,
} from "@timeo/api-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { QRCodeSVG } from "qrcode.react";
import {
  KeyRound,
  Loader2,
  Pencil,
  UserCog,
} from "lucide-react";

type MemberRole = "customer" | "coach" | "staff" | "admin";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  inactive: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/20 text-primary border-primary/35",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/35",
  coach: "bg-indigo-500/20 text-indigo-400 border-indigo-500/35",
  customer: "bg-white/10 text-white/70 border-white/15",
};

const PAYMENT_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending_verification: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ROLE_OPTIONS: Array<{ label: string; value: MemberRole }> = [
  { label: "Customer", value: "customer" },
  { label: "Coach", value: "coach" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function normalizeRole(role: string | null | undefined): MemberRole {
  return role === "admin" || role === "staff" || role === "coach" || role === "customer"
    ? role
    : "customer";
}

function getInitial(name: string | null | undefined, email: string | null | undefined) {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

function prettify(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export interface MemberDetailPanelProps {
  tenantId: string | null | undefined;
  memberId: string | null;
}

export function MemberDetailPanel({ tenantId, memberId }: MemberDetailPanelProps) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useMemberDetail(tenantId, memberId);
  const resetPasswordMutation = useResetPlatformUserPassword();
  const updateMemberMutation = useUpdateMember(tenantId);

  const [selectedRole, setSelectedRole] = useState<MemberRole>("customer");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setSelectedRole(normalizeRole(data.membership.role));
    setTemporaryPassword(null);
  }, [data]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const activeRole = useMemo(
    () => normalizeRole(data?.membership.role),
    [data?.membership.role],
  );

  if (!memberId) {
    return null;
  }

  if (isLoading) {
    return <MemberDetailPanelSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {(error as Error | undefined)?.message ?? "Member not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrValue = data.qrCode ?? data.membership.memberId ?? data.user.id;

  async function handleResetPassword() {
    try {
      const response = await resetPasswordMutation.mutateAsync({
        userId: data.user.id,
      });

      setTemporaryPassword(response.temporaryPassword);
      setNotice({ type: "success", message: "Temporary password generated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: (err as Error | undefined)?.message ?? "Failed to reset password.",
      });
    }
  }

  async function handleSaveRole() {
    if (!memberId) {
      return;
    }

    if (selectedRole === activeRole) {
      setNotice({ type: "success", message: "Role is already up to date." });
      return;
    }

    try {
      await updateMemberMutation.mutateAsync({
        memberId,
        payload: { role: selectedRole },
      });

      setNotice({ type: "success", message: "Member role updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: (err as Error | undefined)?.message ?? "Failed to update role.",
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start gap-3 pr-8">
          <Avatar className="h-14 w-14 border border-white/10">
            {data.user.avatarUrl ? (
              <AvatarImage src={data.user.avatarUrl} alt={data.user.name} />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary font-semibold">
              {getInitial(data.user.name, data.user.email)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">{data.user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{data.user.email}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", ROLE_BADGE[data.membership.role] ?? ROLE_BADGE.customer)}
              >
                {prettify(data.membership.role)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  STATUS_BADGE[data.membershipStatus] ?? STATUS_BADGE.inactive,
                )}
              >
                {prettify(data.membershipStatus)}
              </Badge>
              {data.membership.memberId ? (
                <Badge variant="outline" className="text-xs">
                  ID {data.membership.memberId}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {notice ? (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              notice.type === "success"
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/35 bg-red-500/10 text-red-300",
            )}
          >
            {notice.message}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/dashboard/gym/members/${memberId}`)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Reset Password
              </Button>
            </div>

            <div className="space-y-2">
              <Select
                label="Change Role"
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as MemberRole)}
                options={ROLE_OPTIONS}
              />
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={handleSaveRole}
                disabled={updateMemberMutation.isPending}
              >
                {updateMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCog className="h-4 w-4" />
                )}
                Save Role
              </Button>
            </div>

            {temporaryPassword ? (
              <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Temporary password: <span className="font-semibold">{temporaryPassword}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{data.subscription.planName ?? "Active Plan"}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      data.subscription.isActive
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-red-500/30 bg-red-500/15 text-red-300",
                    )}
                  >
                    {prettify(data.subscription.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground/80">Start</p>
                    <p className="mt-1 text-sm text-foreground">
                      {formatDate(data.subscription.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground/80">End</p>
                    <p className="mt-1 text-sm text-foreground">
                      {formatDate(data.subscription.endDate)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.max(0, data.subscription.daysRemaining)} day
                  {Math.max(0, data.subscription.daysRemaining) === 1 ? "" : "s"} remaining
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active subscription.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments found.</p>
            ) : (
              data.payments.slice(0, 10).map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {payment.planName || "Membership Payment"}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", PAYMENT_BADGE[payment.status] ?? PAYMENT_BADGE.rejected)}
                    >
                      {prettify(payment.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {formatMoney(payment.amount, payment.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(payment.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check-in History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.checkIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins recorded.</p>
            ) : (
              data.checkIns.slice(0, 12).map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {prettify(checkIn.method)} · {prettify(checkIn.entryType)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {checkIn.gate ?? checkIn.device ?? "Gym entrance"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(checkIn.timestamp)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.sessionCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No session packages found.</p>
            ) : (
              data.sessionCredits.map((credit) => {
                const progress = credit.totalSessions > 0
                  ? Math.round((credit.usedSessions / credit.totalSessions) * 100)
                  : 0;

                return (
                  <div
                    key={credit.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {credit.packageName ?? "Session Package"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {credit.remainingSessions}/{credit.totalSessions} left
                      </Badge>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Expires {formatDate(credit.expiresAt)}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Member QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-6">
            <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
              <QRCodeSVG value={qrValue} size={180} />
            </div>
            <p className="text-center text-xs text-muted-foreground break-all">{qrValue}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Phone: {data.user.phone ?? "-"}</p>
            <p>Joined: {formatDate(data.membership.joinedAt)}</p>
            <p>Created: {formatDate(data.user.createdAt)}</p>
            <p>Coach: {data.membership.coachId ?? "Unassigned"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemberDetailPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
