"use client";

import { useMemo } from "react";
import {
  useApprovePaymentRequest,
  useCreateInvoice,
  usePaymentRequests,
  usePosTransactions,
  useRejectPaymentRequest,
  useSendPaymentReminder,
  useTenantSubscriptions,
} from "@timeo/api-client";
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
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Mail,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatRM(cents: number) {
  return `RM ${(cents / 100).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function exportCsv(filename: string, rows: string[][]) {
  const escaped = rows.map((row) =>
    row
      .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
      .join(","),
  );

  const blob = new Blob([`${escaped.join("\n")}\n`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BillingDashboardPage() {
  const { tenantId } = useTenantId();

  const { data: paymentRequests, isLoading: paymentLoading } = usePaymentRequests(tenantId);
  const { data: posRows, isLoading: posLoading } = usePosTransactions(tenantId);
  const { data: subscriptions, isLoading: subscriptionsLoading } = useTenantSubscriptions(tenantId);

  const { mutateAsync: approvePayment, isPending: approving } =
    useApprovePaymentRequest(tenantId ?? "");
  const { mutateAsync: rejectPayment, isPending: rejecting } =
    useRejectPaymentRequest(tenantId ?? "");
  const { mutateAsync: sendReminder, isPending: sendingReminder } =
    useSendPaymentReminder(tenantId ?? "");
  const { mutateAsync: createInvoice, isPending: creatingInvoice } =
    useCreateInvoice(tenantId ?? "");

  const normalizedPos = useMemo(() => {
    return (posRows ?? []).map((raw: any) => {
      const transaction = raw?.transaction ?? raw;
      return {
        id: transaction?.id,
        total: transaction?.total ?? 0,
        currency: transaction?.currency ?? "MYR",
        paymentMethod:
          transaction?.paymentMethod ??
          transaction?.payment_method ??
          "unknown",
        createdAt:
          transaction?.createdAt ?? transaction?.created_at ?? new Date().toISOString(),
        reference:
          transaction?.receiptNumber ?? transaction?.receipt_number ?? transaction?.id,
        memberName: raw?.customer?.name ?? raw?.customerName ?? "Walk-in",
      };
    });
  }, [posRows]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const approvedRequests = (paymentRequests ?? []).filter((row) => row.status === "approved");
  const pendingRequests = (paymentRequests ?? []).filter(
    (row) => row.status === "pending_verification",
  );

  const overdueMembers = useMemo(() => {
    return (subscriptions ?? []).filter((sub) => {
      const endDate =
        parseDate((sub as any).currentPeriodEnd) ??
        parseDate((sub as any).subscription?.currentPeriodEnd) ??
        parseDate((sub as any).current_period_end);
      const status = (sub as any).status ?? (sub as any).subscription?.status;
      return !!endDate && endDate < now && (status === "active" || status === "past_due");
    });
  }, [subscriptions, now]);

  const totalRevenueThisMonth = useMemo(() => {
    const requestRevenue = approvedRequests
      .filter((row) => {
        const createdAt = parseDate(row.createdAt);
        return !!createdAt && createdAt >= startOfMonth;
      })
      .reduce((sum, row) => sum + row.amount, 0);

    const posRevenue = normalizedPos
      .filter((row) => {
        const createdAt = parseDate(row.createdAt);
        return !!createdAt && createdAt >= startOfMonth;
      })
      .reduce((sum, row) => sum + row.total, 0);

    return requestRevenue + posRevenue;
  }, [approvedRequests, normalizedPos, startOfMonth]);

  const outstandingPayments = pendingRequests.reduce((sum, row) => sum + row.amount, 0);

  const revenueSeries = useMemo(() => {
    const buckets = new Map<
      string,
      { month: string; membership: number; sessionPackage: number; pos: number }
    >();

    const seed = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let index = 5; index >= 0; index -= 1) {
      const dt = new Date(seed.getFullYear(), seed.getMonth() - index, 1);
      const key = toIsoMonth(dt);
      buckets.set(key, {
        month: dt.toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        membership: 0,
        sessionPackage: 0,
        pos: 0,
      });
    }

    for (const row of approvedRequests) {
      const createdAt = parseDate(row.createdAt);
      if (!createdAt) continue;
      const key = toIsoMonth(createdAt);
      if (!buckets.has(key)) continue;

      const bucket = buckets.get(key)!;
      if (row.planReferenceType === "membership") {
        bucket.membership += row.amount;
      } else {
        bucket.sessionPackage += row.amount;
      }
    }

    for (const row of normalizedPos) {
      const createdAt = parseDate(row.createdAt);
      if (!createdAt) continue;
      const key = toIsoMonth(createdAt);
      if (!buckets.has(key)) continue;

      const bucket = buckets.get(key)!;
      bucket.pos += row.total;
    }

    return Array.from(buckets.values());
  }, [approvedRequests, normalizedPos, now]);

  const paymentHistory = useMemo(() => {
    const requestRows = (paymentRequests ?? []).map((row) => ({
      id: row.id,
      source: "payment_request" as const,
      reference: row.id,
      memberName: row.memberName ?? row.customerId,
      description: row.planName,
      amount: row.amount,
      status: row.status,
      date: row.createdAt,
      paymentMethod: row.receiptUrl ? "manual_transfer" : "pending_receipt",
    }));

    const posHistoryRows = normalizedPos.map((row) => ({
      id: row.id,
      source: "pos_transaction" as const,
      reference: row.reference,
      memberName: row.memberName,
      description: "POS sale",
      amount: row.total,
      status: "completed",
      date: row.createdAt,
      paymentMethod: row.paymentMethod,
    }));

    return [...requestRows, ...posHistoryRows].sort(
      (a, b) =>
        (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0),
    );
  }, [normalizedPos, paymentRequests]);

  const isLoading = paymentLoading || posLoading || subscriptionsLoading;

  async function handleApprove(requestId: string) {
    await approvePayment({ requestId });
  }

  async function handleReject(requestId: string) {
    const reason = window.prompt("Enter rejection reason");
    if (!reason?.trim()) return;
    await rejectPayment({ requestId, adminNote: reason.trim() });
  }

  async function handleReminder(requestId: string) {
    await sendReminder({ requestId });
  }

  async function handleGenerateInvoice(requestId: string) {
    await createInvoice({
      sourceType: "payment_request",
      sourceId: requestId,
      status: "draft",
    });
  }

  function handleExportCsv() {
    const rows = [
      [
        "Date",
        "Source",
        "Reference",
        "Member",
        "Description",
        "Amount (MYR)",
        "Status",
        "Payment Method",
      ],
      ...paymentHistory.map((row) => [
        parseDate(row.date)?.toLocaleString("en-MY") ?? "",
        row.source,
        row.reference,
        row.memberName,
        row.description,
        (row.amount / 100).toFixed(2),
        row.status,
        row.paymentMethod,
      ]),
    ];

    exportCsv(`billing-history-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Revenue overview, renewals, and payment operations.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportCsv}
          disabled={paymentHistory.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Revenue (This Month)"
          value={formatRM(totalRevenueThisMonth)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <MetricCard
          label="Outstanding Payments"
          value={formatRM(outstandingPayments)}
          icon={CreditCard}
          loading={isLoading}
        />
        <MetricCard
          label="Overdue Members"
          value={String(overdueMembers.length)}
          icon={CalendarClock}
          loading={isLoading}
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="h-full w-full bg-white/[0.05]" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
                <XAxis dataKey="month" stroke="#ffffff66" />
                <YAxis stroke="#ffffff66" tickFormatter={(value) => `RM ${Math.round(value / 100)}`} />
                <Tooltip
                  formatter={(value: number) => formatRM(value)}
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #ffffff22",
                    borderRadius: 10,
                  }}
                />
                <Legend />
                <Bar dataKey="membership" name="Membership" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sessionPackage" name="Session Package" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pos" name="POS" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Pending Renewals / Top-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full bg-white/[0.05]" />
            ) : pendingRequests.length === 0 ? (
              <EmptyState text="No pending payment requests." />
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.planName}</p>
                      <p className="text-xs text-white/60">
                        {request.memberName ?? request.customerId} · {formatRM(request.amount)}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {parseDate(request.createdAt)?.toLocaleString("en-MY")}
                      </p>
                    </div>
                    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                      Pending
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      disabled={approving}
                      onClick={() => handleApprove(request.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 border-red-500/30 text-red-400"
                      disabled={rejecting}
                      onClick={() => handleReject(request.id)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      disabled={sendingReminder}
                      onClick={() => handleReminder(request.id)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Reminder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      disabled={creatingInvoice}
                      onClick={() => handleGenerateInvoice(request.id)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Overdue Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full bg-white/[0.05]" />
            ) : overdueMembers.length === 0 ? (
              <EmptyState text="No overdue memberships." />
            ) : (
              overdueMembers.map((sub: any) => {
                const planName = sub.planName ?? sub.plan?.name ?? "Membership";
                const memberName = sub.memberName ?? sub.memberEmail ?? "Member";
                const endDate =
                  parseDate(sub.currentPeriodEnd) ??
                  parseDate(sub.subscription?.currentPeriodEnd) ??
                  parseDate(sub.current_period_end);

                return (
                  <div
                    key={sub.id ?? sub.subscription?.id}
                    className="rounded-xl border border-red-500/20 bg-red-500/5 p-3"
                  >
                    <p className="text-sm font-semibold text-white">{memberName}</p>
                    <p className="text-xs text-white/60">{planName}</p>
                    <p className="mt-1 text-xs text-red-300">
                      Expired {endDate?.toLocaleDateString("en-MY")}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/[0.05]" />
              ))}
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="p-8">
              <EmptyState text="No payment records found." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-xs text-white/50">Date</th>
                    <th className="px-4 py-3 text-left text-xs text-white/50">Source</th>
                    <th className="px-4 py-3 text-left text-xs text-white/50">Member</th>
                    <th className="px-4 py-3 text-left text-xs text-white/50">Description</th>
                    <th className="px-4 py-3 text-left text-xs text-white/50">Amount</th>
                    <th className="px-4 py-3 text-left text-xs text-white/50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.slice(0, 50).map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-white/[0.06]">
                      <td className="px-4 py-3 text-xs text-white/70">
                        {parseDate(row.date)?.toLocaleString("en-MY")}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/70">
                        <Badge
                          className={cn(
                            "border",
                            row.source === "payment_request"
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
                          )}
                        >
                          {row.source === "payment_request" ? "Request" : "POS"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/70">{row.memberName}</td>
                      <td className="px-4 py-3 text-xs text-white/70">{row.description}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-white">
                        {formatRM(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/70">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-28 bg-white/[0.05]" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{value}</p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <AlertCircle className="h-6 w-6 text-white/25" />
      <p className="text-sm text-white/50">{text}</p>
    </div>
  );
}

