"use client";

import { useMemo, useState, useRef } from "react";
import {
  useSessionCredits,
  useMemberships,
  useMySubscriptions,
  useMyPaymentRequests,
  useCreatePaymentRequest,
  useUploadFile,
  useUploadPaymentReceipt,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  CreditCard,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  ChevronRight,
  QrCode,
  Banknote,
  ArrowLeft,
} from "lucide-react";
import { formatPrice } from "@timeo/shared";
import type { PaymentRequest } from "@timeo/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationMonths?: number;
  planType: string;
  features: string[];
  description?: string;
  interval: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRM(cents: number) {
  return `RM ${(cents / 100).toFixed(0)}`;
}

function getSubscriptionEndDate(subscription: any): string | null {
  return (
    subscription?.currentPeriodEnd ??
    subscription?.current_period_end ??
    subscription?.subscription?.currentPeriodEnd ??
    subscription?.subscription?.current_period_end ??
    null
  );
}

function getSubscriptionPlanName(subscription: any): string {
  return (
    subscription?.planName ??
    subscription?.plan?.name ??
    "No active membership"
  );
}

function getSubscriptionStatus(subscription: any): string {
  return (
    subscription?.status ??
    subscription?.subscription?.status ??
    "inactive"
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-400" />;
  }
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending_verification: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = {
    pending_verification: "Pending Verification",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30",
      )}
    >
      {getStatusIcon(status)}
      {labels[status] ?? status}
    </span>
  );
}

// ─── Plan Selection Modal ─────────────────────────────────────────────────────

function PlanSelectionModal({
  open,
  onClose,
  plans,
  isLoading,
  currentPlanId,
  intent,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  plans: MembershipPlan[];
  isLoading: boolean;
  currentPlanId?: string | null;
  intent: "renew" | "upgrade" | "buy";
  onSelect: (plan: MembershipPlan) => void;
}) {
  const modalTitle =
    intent === "renew"
      ? "Renew Membership"
      : intent === "upgrade"
        ? "Upgrade Membership"
        : "Choose a Membership Plan";

  const modalDescription =
    intent === "renew"
      ? "Select your renewal plan and continue payment with DuitNow."
      : intent === "upgrade"
        ? "Choose a different plan to upgrade your current membership."
        : "Select the plan that suits you best. Payment via DuitNow.";

  const availablePlans =
    intent === "upgrade" && currentPlanId
      ? plans.filter((plan) => plan.id !== currentPlanId)
      : plans;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg bg-white/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {availablePlans.length === 0 && (
              <p className="py-8 text-center text-sm text-white/40">
                {intent === "upgrade"
                  ? "No alternative plans available to upgrade right now."
                  : "No membership plans available at this time."}
              </p>
            )}
            {availablePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => onSelect(plan)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {plan.name}
                      {currentPlanId && plan.id === currentPlanId && (
                        <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {plan.durationMonths
                        ? plan.durationMonths >= 12
                          ? "12 months access"
                          : `${plan.durationMonths} month${plan.durationMonths > 1 ? "s" : ""} access`
                        : plan.interval === "yearly"
                          ? "12 months access"
                          : "Monthly access"}
                    </p>
                    {plan.features.length > 0 && (
                      <p className="mt-1 text-xs text-white/30">
                        {plan.features.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-emerald-400">
                      {formatRM(plan.price)}
                    </p>
                    <ChevronRight className="ml-auto mt-1 h-4 w-4 text-white/30" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DuitNow Payment Modal ────────────────────────────────────────────────────

function DuitNowPaymentModal({
  open,
  plan,
  tenantId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  plan: MembershipPlan | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"payment" | "receipt" | "done">("payment");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [memberNote, setMemberNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createPaymentRequest } = useCreatePaymentRequest(tenantId);
  const { mutateAsync: uploadFile } = useUploadFile(tenantId);
  const { mutateAsync: uploadReceipt } = useUploadPaymentReceipt(tenantId);

  function handleReset() {
    setStep("payment");
    setReceiptFile(null);
    setPreviewUrl(null);
    setPaymentRequestId(null);
    setMemberNote("");
    setUploading(false);
    setSubmitting(false);
    setError(null);
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  async function handleProceedToReceipt() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPaymentRequest({
        planId: plan.id,
        planReferenceType: "membership",
        memberNote: memberNote || undefined,
      });
      setPaymentRequestId(result.id);
      setStep("receipt");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to create payment request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReceipt() {
    if (!paymentRequestId || !receiptFile) {
      setError("Please upload your payment receipt");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // Upload the file first
      const uploaded = await uploadFile(receiptFile);
      // Then attach to payment request
      await uploadReceipt({ requestId: paymentRequestId, receiptUrl: uploaded.url });
      setStep("done");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  }

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "payment" && "DuitNow Payment"}
            {step === "receipt" && "Upload Receipt"}
            {step === "done" && "Payment Submitted!"}
          </DialogTitle>
          <DialogDescription>
            {step === "payment" && `${plan.name} — ${formatRM(plan.price)}`}
            {step === "receipt" && "Upload your payment receipt for verification"}
            {step === "done" && "We'll verify your payment and activate your membership shortly."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Payment instructions */}
        {step === "payment" && (
          <div className="space-y-5">
            {/* Amount */}
            <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
              <p className="text-sm text-emerald-300/70">Amount to Pay</p>
              <p className="mt-1 text-4xl font-bold text-emerald-400">
                {formatRM(plan.price)}
              </p>
              <p className="mt-1 text-xs text-white/40">{plan.name}</p>
            </div>

            {/* DuitNow QR placeholder */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                <QrCode className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-white">DuitNow QR</p>
              <p className="mt-1 text-xs text-white/40">
                Scan with your banking app
              </p>
              <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-3">
                <p className="text-xs font-medium text-blue-300">Merchant: WS FITNESS</p>
                <p className="text-xs text-white/40 mt-0.5">Reference: WSFIT-MEMBERSHIP</p>
              </div>
            </div>

            {/* Bank transfer alternative */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-medium text-white">Bank Transfer</p>
              </div>
              <div className="space-y-1 text-xs text-white/50">
                <p>Bank: <span className="text-white/80 font-medium">Maybank</span></p>
                <p>Account Name: <span className="text-white/80 font-medium">WS FITNESS SDN BHD</span></p>
                <p>Account No: <span className="text-white/80 font-medium">5621 4567 8901</span></p>
                <p className="mt-2 text-white/30">
                  Please use your registered name or email as reference.
                </p>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-xs text-white/50">
                Note (optional)
              </label>
              <textarea
                value={memberNote}
                onChange={(e) => setMemberNote(e.target.value)}
                placeholder="e.g. Transferred from CIMB on 11/3/2026"
                rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>
        )}

        {/* Step 2: Upload receipt */}
        {step === "receipt" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
              <p className="text-xs text-emerald-300/70">Payment for</p>
              <p className="font-semibold text-emerald-400">{plan.name} — {formatRM(plan.price)}</p>
            </div>

            {/* File upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
                previewUrl
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/[0.12] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
              )}
            >
              {previewUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="mx-auto max-h-48 rounded-lg object-contain"
                  />
                  <p className="text-xs text-emerald-400">
                    <CheckCircle2 className="inline h-3 w-3 mr-1" />
                    {receiptFile?.name}
                  </p>
                  <p className="text-xs text-white/30">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
                    <Upload className="h-6 w-6 text-white/40" />
                  </div>
                  <p className="text-sm text-white/70">
                    Tap to upload receipt
                  </p>
                  <p className="text-xs text-white/30">
                    Screenshot or photo of your payment proof
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Receipt Submitted!</p>
              <p className="mt-1 text-sm text-white/50">
                Our admin will verify your payment within 24 hours. Your membership will be activated upon approval.
              </p>
            </div>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <p className="text-xs text-yellow-300/80">
                <Clock className="inline h-3 w-3 mr-1" />
                Status: <strong>Pending Verification</strong>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "payment" && (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToReceipt}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? "Processing..." : "I've Paid — Upload Receipt"}
              </Button>
            </>
          )}
          {step === "receipt" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("payment")}
                disabled={uploading}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmitReceipt}
                disabled={uploading || !receiptFile}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? "Uploading..." : "Submit Receipt"}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => { handleReset(); onSuccess(); }}
              className="w-full"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Request Card ─────────────────────────────────────────────────────

function PaymentRequestCard({ req }: { req: PaymentRequest }) {
  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-white">{req.planName}</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-400">
              {formatRM(req.amount)}
            </p>
            <p className="mt-1 text-xs text-white/30">
              Submitted{" "}
              {new Date(req.createdAt).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            {req.adminNote && (
              <p className="mt-2 text-xs text-white/50 italic">
                Admin: {req.adminNote}
              </p>
            )}
          </div>
          <div className="shrink-0">{getStatusBadge(req.status)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyPackagesPage() {
  const { tenantId } = useTenantId();
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [planIntent, setPlanIntent] = useState<"renew" | "upgrade" | "buy">("buy");

  const { data: credits, isLoading: creditsLoading } = useSessionCredits(tenantId);
  const { data: membershipsData, isLoading: plansLoading } = useMemberships(tenantId);
  const { data: subscriptions, refetch: refetchSubscriptions } = useMySubscriptions(tenantId);
  const { data: paymentRequests, isLoading: requestsLoading, refetch: refetchRequests } = useMyPaymentRequests(tenantId);

  const isLoading = creditsLoading || requestsLoading;

  // Normalize plan data from API (API returns snake_case DB rows)
  const plans: MembershipPlan[] = (membershipsData ?? [])
    .filter((membership) => (membership.is_active ?? membership.isActive ?? true))
    .map((membership) => ({
      id: membership.id,
      name: membership.name,
      price: membership.price,
      currency: membership.currency ?? "MYR",
      durationMonths: membership.duration_months ?? membership.durationMonths,
      planType: membership.plan_type ?? membership.planType ?? "all_access",
      features: membership.features ?? membership.benefits ?? [],
      description: membership.description,
      interval: membership.interval ?? membership.billingInterval ?? "monthly",
    }));

  const latestSubscription = useMemo(() => {
    return [...(subscriptions ?? [])].sort((left, right) => {
      const leftTime = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
      const rightTime = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
      return rightTime - leftTime;
    })[0];
  }, [subscriptions]);

  const currentMembershipId =
    latestSubscription?.membershipId ??
    latestSubscription?.subscription?.membershipId ??
    null;
  const currentPlanName = getSubscriptionPlanName(latestSubscription);
  const subscriptionStatus = getSubscriptionStatus(latestSubscription);
  const subscriptionEndDate = getSubscriptionEndDate(latestSubscription);
  const daysUntilExpiry = subscriptionEndDate
    ? Math.ceil((new Date(subscriptionEndDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 30;
  const shouldShowRenew = !latestSubscription || isExpired || isExpiringSoon;

  // Check for active/pending membership
  const pendingRequest = paymentRequests?.find(
    (r) => r.status === "pending_verification",
  );
  const pendingMembershipRequest = paymentRequests?.find(
    (request) =>
      request.status === "pending_verification" &&
      request.planReferenceType === "membership",
  );

  function openPlanModal(intent: "renew" | "upgrade" | "buy") {
    setPlanIntent(intent);
    setPlanModalOpen(true);
  }

  function handleSelectPlan(plan: MembershipPlan) {
    setSelectedPlan(plan);
    setPlanModalOpen(false);
    setPaymentModalOpen(true);
  }

  function handlePaymentSuccess() {
    setPaymentModalOpen(false);
    setSelectedPlan(null);
    refetchRequests();
    refetchSubscriptions();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            My Packages
          </h1>
          <p className="text-sm text-white/50">
            Membership plans and session credits
          </p>
        </div>
        {!pendingMembershipRequest && (
          <Button
            onClick={() => openPlanModal(shouldShowRenew ? "renew" : "upgrade")}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {shouldShowRenew ? "Renew" : "Upgrade"}
          </Button>
        )}
      </div>

      {/* Current subscription status */}
      <Card className="glass border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-white/60">
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div>
              <p className="text-base font-semibold text-white">{currentPlanName}</p>
              <p className="mt-1 text-xs text-white/45">
                Expiry: {subscriptionEndDate
                  ? new Date(subscriptionEndDate).toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "No expiry date"}
              </p>
              {daysUntilExpiry !== null && (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isExpired
                      ? "text-red-400"
                      : isExpiringSoon
                        ? "text-yellow-400"
                        : "text-emerald-400",
                  )}
                >
                  {isExpired
                    ? "Expired"
                    : `${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} remaining`}
                </p>
              )}
            </div>
            <Badge
              className={cn(
                "rounded-full border px-2 py-0 text-[11px]",
                subscriptionStatus === "active" &&
                  "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
                subscriptionStatus === "past_due" &&
                  "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
                subscriptionStatus === "canceled" &&
                  "border-red-500/30 bg-red-500/15 text-red-300",
                subscriptionStatus === "inactive" &&
                  "border-white/[0.12] bg-white/[0.06] text-white/60",
              )}
            >
              {subscriptionStatus}
            </Badge>
          </div>

          {!pendingMembershipRequest && (
            <div className="flex flex-wrap gap-2">
              {shouldShowRenew && (
                <Button
                  size="sm"
                  onClick={() => openPlanModal("renew")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Renew
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPlanModal("upgrade")}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Upgrade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending payment notice */}
      {pendingRequest && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-yellow-500/10 p-2">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-300">
                Payment Pending Verification
              </p>
              <p className="text-xs text-yellow-300/60">
                Your payment for <strong>{pendingRequest.planName}</strong> is being reviewed.
                We'll activate your membership once verified.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Credits */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : credits && credits.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white/60 uppercase tracking-wider">
            Session Credits
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {credits.map((credit) => {
              const total = (credit as any).credit?.totalSessions ?? (credit as any).totalSessions ?? 0;
              const used = (credit as any).credit?.usedSessions ?? (credit as any).usedSessions ?? 0;
              const remaining = (credit as any).credit ? total - used : ((credit as any).remaining ?? 0);
              const progressPercent =
                total > 0 ? Math.round((used / total) * 100) : 0;
              const isExpired =
                ((credit as any).credit?.expiresAt ?? (credit as any).expiresAt) !== undefined &&
                ((credit as any).credit?.expiresAt ?? (credit as any).expiresAt) !== null &&
                new Date((credit as any).credit?.expiresAt ?? (credit as any).expiresAt).getTime() < Date.now();
              const isFullyUsed = remaining <= 0;

              return (
                <Card
                  key={(credit as any).credit?.id ?? (credit as any).id}
                  className={cn(
                    "glass border-white/[0.08]",
                    (isExpired || isFullyUsed) && "opacity-60",
                  )}
                >
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <CreditCard className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {(credit as any).package?.name ?? (credit as any).packageName ?? "Session Package"}
                          </p>
                          {isExpired ? (
                            <span className="text-xs text-red-400">Expired</span>
                          ) : isFullyUsed ? (
                            <span className="text-xs text-white/40">Fully used</span>
                          ) : (
                            <span className="text-xs text-emerald-400">Active</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{remaining}</p>
                        <p className="text-xs text-white/40">remaining</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-white/40">
                        <span>{used} used</span>
                        <span>{total} total</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            progressPercent >= 100
                              ? "bg-red-500/60"
                              : progressPercent >= 75
                                ? "bg-yellow-500/60"
                                : "bg-emerald-500/60",
                          )}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    {((credit as any).credit?.expiresAt ?? (credit as any).expiresAt) && (
                      <p className="mt-3 text-xs text-white/30">
                        {isExpired ? "Expired" : "Expires"}{" "}
                        {new Date((credit as any).credit?.expiresAt ?? (credit as any).expiresAt).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Payment History */}
      {!requestsLoading && paymentRequests && paymentRequests.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white/60 uppercase tracking-wider">
            Payment Requests
          </h2>
          <div className="space-y-3">
            {paymentRequests.map((req) => (
              <PaymentRequestCard key={req.id} req={req} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading &&
        (!credits || credits.length === 0) &&
        (!paymentRequests || paymentRequests.length === 0) && (
          <EmptyState onBuyClick={() => openPlanModal("buy")} />
        )}

      {/* Modals */}
      <PlanSelectionModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        plans={plans}
        isLoading={plansLoading}
        currentPlanId={currentMembershipId}
        intent={planIntent}
        onSelect={handleSelectPlan}
      />

      {selectedPlan && tenantId && (
        <DuitNowPaymentModal
          open={paymentModalOpen}
          plan={selectedPlan}
          tenantId={tenantId}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPlan(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="glass border-white/[0.08]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-white/[0.06]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                <Skeleton className="h-3 w-16 bg-white/[0.06]" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full bg-white/[0.06]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onBuyClick }: { onBuyClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-white/[0.04] p-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No active packages</p>
      <p className="mt-1 text-xs text-white/30">
        Purchase a membership to access the gym.
      </p>
      <Button
        onClick={onBuyClick}
        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
        size="sm"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Buy Membership
      </Button>
    </div>
  );
}
