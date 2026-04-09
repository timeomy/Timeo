"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  useMyInvoices,
  useMyPaymentRequests,
  useMySubscriptions,
} from "@timeo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Receipt,
} from "lucide-react";
import { formatPrice } from "@timeo/shared";
import { useTenantId } from "@/hooks/use-tenant-id";

function getSubscriptionEndDate(subscription: any): string | null {
  return (
    subscription?.currentPeriodEnd ??
    subscription?.current_period_end ??
    subscription?.subscription?.currentPeriodEnd ??
    subscription?.subscription?.current_period_end ??
    null
  );
}

function getSubscriptionStatus(subscription: any): string {
  return (
    subscription?.status ??
    subscription?.subscription?.status ??
    "inactive"
  );
}

function getSubscriptionPlanName(subscription: any): string {
  return (
    subscription?.planName ??
    subscription?.plan?.name ??
    "No active plan"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / 86_400_000);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() ?? "draft";
  const styles: Record<string, string> = {
    draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    void: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  return (
    <Badge
      className={cn(
        "rounded-full border px-2 py-0 text-[11px]",
        styles[normalized] ?? styles.draft,
      )}
    >
      {normalized}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() ?? "pending_verification";
  const styles: Record<string, string> = {
    pending_verification: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  return (
    <Badge
      className={cn(
        "rounded-full border px-2 py-0 text-[11px]",
        styles[normalized] ?? styles.pending_verification,
      )}
    >
      {normalized.replaceAll("_", " ")}
    </Badge>
  );
}

export default function PortalBillingPage() {
  const { tenantId } = useTenantId();
  const searchParams = useSearchParams();
  const highlightedInvoiceId = searchParams.get("invoice");

  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useMySubscriptions(tenantId);
  const { data: paymentRequests = [], isLoading: paymentsLoading } =
    useMyPaymentRequests(tenantId);
  const { data: invoices = [], isLoading: invoicesLoading } = useMyInvoices(tenantId);

  const latestSubscription = useMemo(() => {
    return [...(subscriptions ?? [])].sort((left, right) => {
      const leftDate = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
      const rightDate = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
      return rightDate - leftDate;
    })[0];
  }, [subscriptions]);

  const nextPaymentDate = getSubscriptionEndDate(latestSubscription);
  const daysUntilRenewal = getDaysUntil(nextPaymentDate);
  const status = getSubscriptionStatus(latestSubscription);
  const hasPlan = !!latestSubscription;
  const shouldRenew = !hasPlan || (daysUntilRenewal !== null && daysUntilRenewal <= 30);
  const pendingRenewal = paymentRequests.find(
    (row) => row.status === "pending_verification" && row.planReferenceType === "membership",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Billing</h1>
        <p className="text-sm text-white/55">
          Current plan, upcoming renewal, payments, and invoices.
        </p>
      </div>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <CalendarClock className="h-4 w-4 text-emerald-300" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionsLoading ? (
            <Skeleton className="h-28 rounded-xl bg-white/[0.06]" />
          ) : (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40">Membership</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {getSubscriptionPlanName(latestSubscription)}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Next payment date: {formatDate(nextPaymentDate)}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full border px-2 py-0 text-[11px]",
                      status === "active" &&
                        "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
                      status === "past_due" && "border-amber-500/30 bg-amber-500/15 text-amber-300",
                      status === "canceled" && "border-red-500/30 bg-red-500/15 text-red-300",
                      status === "inactive" && "border-white/[0.12] bg-white/[0.06] text-white/60",
                    )}
                  >
                    {status}
                  </Badge>
                </div>

                {daysUntilRenewal !== null && (
                  <p className="mt-3 text-sm text-white/70">
                    {daysUntilRenewal > 0
                      ? `${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"} remaining`
                      : "Subscription expired"}
                  </p>
                )}
              </div>

              {pendingRenewal ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-300">Renewal pending verification</p>
                  <p className="mt-1 text-xs text-amber-200/75">
                    Your payment for {pendingRenewal.planName} is being reviewed.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link href="/portal/packages">
                  <Button className="h-10 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <CreditCard className="h-4 w-4" />
                    {shouldRenew ? "Renew Plan" : "Upgrade Plan"}
                  </Button>
                </Link>
                <Link href="/portal/packages">
                  <Button variant="outline" className="h-10 gap-2 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    Top Up / Buy Package
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Receipt className="h-4 w-4 text-blue-300" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {paymentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl bg-white/[0.06]" />
              ))}
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center">
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-white/25" />
              <p className="text-sm text-white/55">No payment records yet.</p>
            </div>
          ) : (
            paymentRequests.slice(0, 10).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{request.planName}</p>
                  <p className="text-xs text-white/50">
                    {formatDate(request.createdAt)} · {formatPrice(request.amount, request.currency)}
                  </p>
                </div>
                <PaymentStatusBadge status={request.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileText className="h-4 w-4 text-emerald-300" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoicesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl bg-white/[0.06]" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center">
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-white/25" />
              <p className="text-sm text-white/55">No invoices available yet.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-black/20 p-3",
                  invoice.id === highlightedInvoiceId
                    ? "border-emerald-500/35"
                    : "border-white/[0.08]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatDate(invoice.issueDate ?? invoice.createdAt)} · {formatPrice(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InvoiceStatusBadge status={invoice.status} />
                  {tenantId ? (
                    <a
                      href={`/api/tenants/${tenantId}/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
