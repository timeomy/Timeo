"use client";

import { useState } from "react";
import {
  usePaymentRequests,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  type PaymentRequest,
  type PaymentRequestStatus,
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
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  AlertCircle,
  Receipt,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRM(cents: number) {
  return `RM ${(cents / 100).toFixed(0)}`;
}

const STATUS_LABEL: Record<PaymentRequestStatus, string> = {
  pending_verification: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<PaymentRequestStatus, string> = {
  pending_verification: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: PaymentRequestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  request,
  tenantId,
  onClose,
}: {
  request: PaymentRequest | null;
  tenantId: string;
  onClose: () => void;
}) {
  const [adminNote, setAdminNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: approve } = useApprovePaymentRequest(tenantId);
  const { mutateAsync: reject } = useRejectPaymentRequest(tenantId);

  if (!request) return null;

  const isReadOnly = request.status !== "pending_verification";

  async function handleApprove() {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      await approve({ requestId: request.id, adminNote: adminNote || undefined });
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!request) return;
    if (!rejectionNote.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await reject({ requestId: request.id, adminNote: rejectionNote });
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to reject");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Request Review</DialogTitle>
          <DialogDescription>
            Review the member's payment details and receipt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Status</span>
            <StatusBadge status={request.status} />
          </div>

          {/* Plan info */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-white">{request.planName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-white/40">Amount</p>
                <p className="font-semibold text-emerald-400">{formatRM(request.amount)}</p>
              </div>
              {request.planDurationMonths && (
                <div>
                  <p className="text-white/40">Duration</p>
                  <p className="text-white/80">
                    {request.planDurationMonths >= 12
                      ? "12 months"
                      : `${request.planDurationMonths} month${request.planDurationMonths > 1 ? "s" : ""}`}
                  </p>
                </div>
              )}
              {request.planSessionCount && (
                <div>
                  <p className="text-white/40">Sessions</p>
                  <p className="text-white/80">{request.planSessionCount} sessions</p>
                </div>
              )}
              <div>
                <p className="text-white/40">Submitted</p>
                <p className="text-white/80">
                  {new Date(request.createdAt).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Member note */}
          {request.memberNote && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="text-xs text-white/40 mb-1">Member's Note</p>
              <p className="text-sm text-white/70 italic">{request.memberNote}</p>
            </div>
          )}

          {/* Receipt */}
          {request.receiptUrl ? (
            <div>
              <p className="mb-2 text-xs text-white/40">Payment Receipt</p>
              <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={request.receiptUrl}
                  alt="Payment receipt"
                  className="w-full object-contain max-h-64"
                />
              </div>
              <a
                href={request.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                <Eye className="h-3 w-3" />
                View full image
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/[0.08] p-4 text-center">
              <Receipt className="mx-auto mb-1 h-6 w-6 text-white/20" />
              <p className="text-xs text-white/30">No receipt uploaded yet</p>
            </div>
          )}

          {/* Approval result info */}
          {request.status === "approved" && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs font-medium text-emerald-400">
                <CheckCircle2 className="inline h-3 w-3 mr-1" />
                Approved on{" "}
                {new Date(request.approvedAt ?? "").toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              {request.adminNote && (
                <p className="mt-1 text-xs text-emerald-300/60">{request.adminNote}</p>
              )}
            </div>
          )}

          {request.status === "rejected" && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-medium text-red-400">
                <XCircle className="inline h-3 w-3 mr-1" />
                Rejected
              </p>
              {request.adminNote && (
                <p className="mt-1 text-xs text-red-300/60">{request.adminNote}</p>
              )}
            </div>
          )}

          {/* Action area — only for pending */}
          {!isReadOnly && (
            <>
              {action === null && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => setAction("approve")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setAction("reject")}
                    className="flex-1"
                    disabled={loading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}

              {action === "approve" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs font-medium text-emerald-400">
                      Approving this request will:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-emerald-300/70">
                      <li>• Activate the member's {request.planName}</li>
                      {request.planDurationMonths && (
                        <li>• Set expiry to {request.planDurationMonths} month{request.planDurationMonths > 1 ? "s" : ""} from today</li>
                      )}
                      <li>• Ensure member has an active QR code</li>
                    </ul>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">
                      Admin Note (optional)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Internal note for this approval..."
                      rows={2}
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none"
                    />
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setAction(null)}
                      disabled={loading}
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {loading ? "Approving..." : "Confirm Approval"}
                    </Button>
                  </div>
                </div>
              )}

              {action === "reject" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">
                      Rejection Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="e.g. Receipt not clear, wrong amount, duplicate submission..."
                      rows={3}
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none"
                    />
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setAction(null)}
                      disabled={loading}
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={loading || !rejectionNote.trim()}
                      className="flex-1"
                    >
                      {loading ? "Rejecting..." : "Confirm Rejection"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isReadOnly && (
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Row ──────────────────────────────────────────────────────────────

function RequestRow({
  req,
  onClick,
}: {
  req: PaymentRequest;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{req.planName}</p>
          <p className="text-xs text-white/40">
            {req.planReferenceType === "membership" ? "Membership" : "Session Package"}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-emerald-400">
          {formatRM(req.amount)}
        </p>
      </td>
      <td className="px-4 py-3 text-xs text-white/50">
        {new Date(req.createdAt).toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={req.status} />
      </td>
      <td className="px-4 py-3">
        {req.receiptUrl ? (
          <span className="text-xs text-emerald-400">
            <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
            Uploaded
          </span>
        ) : (
          <span className="text-xs text-white/30">No receipt</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Review
        </Button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GymPaymentsPage() {
  const { tenantId } = useTenantId();
  const [filterStatus, setFilterStatus] = useState<PaymentRequestStatus | "all">("all");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [search, setSearch] = useState("");

  const { data: requests, isLoading } = usePaymentRequests(
    tenantId,
    filterStatus !== "all" ? filterStatus : undefined,
  );

  const filtered = (requests ?? []).filter(
    (r) =>
      !search ||
      r.planName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerId.toLowerCase().includes(search.toLowerCase()),
  );

  const pendingCount = requests?.filter((r) => r.status === "pending_verification").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-muted-foreground">
            Review and approve member payment receipts
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">
              {pendingCount} pending
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Pending",
            count: requests?.filter((r) => r.status === "pending_verification").length ?? 0,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            Icon: Clock,
          },
          {
            label: "Approved",
            count: requests?.filter((r) => r.status === "approved").length ?? 0,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            Icon: CheckCircle2,
          },
          {
            label: "Rejected",
            count: requests?.filter((r) => r.status === "rejected").length ?? 0,
            color: "text-red-400",
            bg: "bg-red-500/10",
            Icon: XCircle,
          },
        ].map(({ label, count, color, bg, Icon }) => (
          <Card key={label} className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", bg)}>
                <Icon className={cn("h-5 w-5", color)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", color)}>{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by plan or member..."
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "pending_verification", "approved", "rejected"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      filterStatus === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.06] text-white/60 hover:bg-white/[0.10]",
                    )}
                  >
                    {s === "all"
                      ? "All"
                      : s === "pending_verification"
                        ? "Pending"
                        : s === "approved"
                          ? "Approved"
                          : "Rejected"}
                  </button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Receipt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.05]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full bg-white/[0.06]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-white/20" />
                      <p className="text-sm text-white/40">
                        {filterStatus === "all"
                          ? "No payment requests yet"
                          : `No ${filterStatus === "pending_verification" ? "pending" : filterStatus} requests`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    onClick={() => setSelectedRequest(req)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {tenantId && (
        <ReviewModal
          request={selectedRequest}
          tenantId={tenantId}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
