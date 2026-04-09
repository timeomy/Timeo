"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemberDetail } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
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
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  CalendarClock,
  Coins,
  Mail,
  Phone,
  ReceiptText,
  User,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PAYMENT_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending_verification: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

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

function getInitial(name: string, email: string): string {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full bg-white/[0.06]" />
      <Skeleton className="h-12 w-full bg-white/[0.06]" />
      <Skeleton className="h-72 w-full bg-white/[0.06]" />
    </div>
  );
}

export default function GymMemberDetailPage() {
  const params = useParams();
  const memberIdParam = params?.memberId;
  const memberId = Array.isArray(memberIdParam)
    ? memberIdParam[0]
    : (memberIdParam ?? "");

  const { tenantId } = useTenantId();
  const { data, isLoading, isError, error } = useMemberDetail(tenantId, memberId);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/gym/members">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/60">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-white/60">
            {(error as Error | undefined)?.message ?? "Unable to load member details."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/gym/members">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/60">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-white/10">
                {data.user.avatarUrl ? (
                  <AvatarImage src={data.user.avatarUrl} alt={data.user.name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitial(data.user.name, data.user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold text-white">{data.user.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {data.user.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {data.user.phone ?? "No phone"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  STATUS_BADGE[data.membershipStatus] ?? STATUS_BADGE.expired,
                )}
              >
                {data.membershipStatus}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/70">
                Member ID: {data.membership.memberId ?? "-"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full justify-start bg-white/[0.03]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-white/80">Name: {data.user.name}</p>
                <p className="text-white/70">Email: {data.user.email}</p>
                <p className="text-white/70">Phone: {data.user.phone ?? "-"}</p>
                <p className="text-white/70">Joined: {formatDate(data.membership.joinedAt)}</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Membership Notes & Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {data.membership.tags.length > 0 ? (
                    data.membership.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-white/20 text-white/70">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-white/40">No tags</span>
                  )}
                </div>
                <p className="text-sm text-white/70">
                  {data.membership.notes?.trim() || "No notes"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.subscription ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  <p className="text-white/80">Status: {data.subscription.status}</p>
                  <p className="text-white/80">Plan: {data.subscription.planName ?? "-"}</p>
                  <p className="text-white/80">
                    Days Remaining: {Math.max(0, data.subscription.daysRemaining)}
                  </p>
                  <p className="text-white/70">Start: {formatDate(data.subscription.startDate)}</p>
                  <p className="text-white/70">End: {formatDate(data.subscription.endDate)}</p>
                  <p className="text-white/70">
                    Ends After Cycle: {data.subscription.cancelAtPeriodEnd ? "Yes" : "No"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-white/50">No subscription found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          {data.payments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                No payment requests found.
              </CardContent>
            </Card>
          ) : (
            data.payments.map((payment) => (
              <Card key={payment.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ReceiptText className="h-4 w-4 text-primary" />
                      {payment.planName}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        PAYMENT_BADGE[payment.status] ?? PAYMENT_BADGE.pending_verification,
                      )}
                    >
                      {payment.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="text-white/80">Amount: {formatMoney(payment.amount, payment.currency)}</p>
                    <p className="text-white/70">Requested: {formatDateTime(payment.createdAt)}</p>
                  </div>
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={payment.receiptUrl}
                        alt="Payment receipt"
                        className="max-h-52 w-full rounded-md border border-white/10 object-cover"
                      />
                    </a>
                  ) : (
                    <p className="text-white/40">No receipt uploaded</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="checkins">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Check-in History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Date / Time</TableHead>
                      <TableHead className="text-white/50">Method</TableHead>
                      <TableHead className="text-white/50">Gate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.checkIns.length > 0 ? (
                      data.checkIns.map((checkIn) => (
                        <TableRow key={checkIn.id} className="border-white/[0.06]">
                          <TableCell className="text-white/70">{formatDateTime(checkIn.timestamp)}</TableCell>
                          <TableCell className="text-white/70 capitalize">{checkIn.method}</TableCell>
                          <TableCell className="text-white/60">{checkIn.gate ?? checkIn.device ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-white/[0.06]">
                        <TableCell colSpan={3} className="text-center text-white/50">
                          No check-ins found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Class Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Class</TableHead>
                      <TableHead className="text-white/50">Start</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.classEnrollments.length > 0 ? (
                      data.classEnrollments.map((item) => (
                        <TableRow key={item.id} className="border-white/[0.06]">
                          <TableCell className="text-white/70">{item.className ?? item.classId}</TableCell>
                          <TableCell className="text-white/70">{formatDateTime(item.startTime)}</TableCell>
                          <TableCell className="text-white/70 capitalize">{item.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-white/[0.06]">
                        <TableCell colSpan={3} className="text-center text-white/50">
                          No class enrollments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-3">
          {data.sessionCredits.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                No session credits found.
              </CardContent>
            </Card>
          ) : (
            data.sessionCredits.map((credit) => (
              <Card key={credit.id} className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-primary" />
                    {credit.packageName ?? "Session Package"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p className="text-white/80">Remaining: {credit.remainingSessions}</p>
                  <p className="text-white/70">Total: {credit.totalSessions}</p>
                  <p className="text-white/70">Used: {credit.usedSessions}</p>
                  <p className="text-white/70">Expires: {formatDate(credit.expiresAt)}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
