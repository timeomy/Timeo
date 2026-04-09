"use client";

import { useMemo, useState } from "react";
import {
  type CreateInvoicePayload,
  type Invoice,
  type InvoiceStatus,
  useCreateInvoice,
  useEmailInvoice,
  useInvoice,
  useInvoices,
  useUpdateInvoice,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Separator,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Mail,
  Plus,
  XCircle,
} from "lucide-react";
import { formatPrice } from "@timeo/shared";

type SourceType = "payment_request" | "pos_transaction" | "manual";

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

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    void: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  return (
    <Badge className={cn("rounded-full border px-2 py-0 text-[11px]", styles[status])}>
      {status}
    </Badge>
  );
}

function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateInvoicePayload) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [sourceId, setSourceId] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [taxRateInput, setTaxRateInput] = useState("0");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [error, setError] = useState<string | null>(null);

  const requiresSourceId = sourceType !== "manual";
  const parsedAmount = Number(amountInput);
  const canSubmit = requiresSourceId
    ? sourceId.trim().length > 0
    : description.trim().length > 0 && parsedAmount > 0;

  async function handleCreate() {
    setError(null);

    try {
      const payload: CreateInvoicePayload = {
        sourceType,
        status,
      };

      if (requiresSourceId) {
        payload.sourceId = sourceId.trim();
      } else {
        payload.description = description.trim();
        payload.amount = Math.round(parsedAmount * 100);
        payload.taxRate = Math.max(0, Math.min(100, Math.round(Number(taxRateInput) || 0)));
        payload.memberName = memberName.trim() || undefined;
        payload.memberEmail = memberEmail.trim() || undefined;
        payload.paymentMethod = paymentMethod.trim() || undefined;
      }

      await onSubmit(payload);
      onOpenChange(false);
      setSourceType("manual");
      setSourceId("");
      setDescription("");
      setAmountInput("");
      setTaxRateInput("0");
      setMemberName("");
      setMemberEmail("");
      setPaymentMethod("");
      setStatus("draft");
    } catch (submitError: unknown) {
      setError((submitError as Error).message ?? "Failed to create invoice");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice from a payment request, POS transaction, or manual line item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select
            label="Source Type"
            value={sourceType}
            options={[
              { label: "Manual", value: "manual" },
              { label: "Payment Request", value: "payment_request" },
              { label: "POS Transaction", value: "pos_transaction" },
            ]}
            onChange={(value) => setSourceType(value as SourceType)}
          />

          <Select
            label="Status"
            value={status}
            options={[
              { label: "Draft", value: "draft" },
              { label: "Sent", value: "sent" },
              { label: "Paid", value: "paid" },
              { label: "Void", value: "void" },
            ]}
            onChange={(value) => setStatus(value as InvoiceStatus)}
          />

          {requiresSourceId ? (
            <Input
              label="Source ID *"
              placeholder={
                sourceType === "payment_request"
                  ? "Payment request ID"
                  : "POS transaction ID"
              }
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
            />
          ) : (
            <>
              <Input
                label="Description *"
                placeholder="e.g. Premium Membership Renewal"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Amount (RM) *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="120"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                />
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={taxRateInput}
                  onChange={(event) => setTaxRateInput(event.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Member Name"
                  placeholder="Optional"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                />
                <Input
                  label="Member Email"
                  placeholder="Optional"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                />
              </div>

              <Input
                label="Payment Method"
                placeholder="Optional"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
            </>
          )}

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailDialog({
  invoice,
  tenantId,
  onClose,
  onEmail,
  onStatusChange,
  isMutating,
}: {
  invoice: Invoice | null | undefined;
  tenantId?: string | null;
  onClose: () => void;
  onEmail: (invoiceId: string) => Promise<void>;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  isMutating: boolean;
}) {
  if (!invoice) return null;

  const totalAmount = invoice.totalAmount ?? invoice.amount;
  const lineItems = Array.isArray(invoice.items) ? invoice.items : [];

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Invoice details, status updates, and email delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-xs text-white/45">Member</p>
              <p className="text-sm font-semibold text-white">
                {invoice.memberName ?? invoice.memberEmail ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-xs text-white/45">Issue Date</p>
              <p className="text-sm font-semibold text-white">
                {formatDate(invoice.issueDate ?? invoice.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div>
              <p className="text-xs text-white/45">Total</p>
              <p className="text-xl font-bold text-white">
                {formatPrice(totalAmount, invoice.currency ?? "MYR")}
              </p>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-white/45">Line Items</p>
            {lineItems.length === 0 ? (
              <p className="text-sm text-white/55">No line items.</p>
            ) : (
              lineItems.map((item, index) => {
                const lineTotal =
                  item.total ?? item.quantity * item.unitPrice;

                return (
                  <div
                    key={`${invoice.id}-item-${index}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2"
                  >
                    <p className="text-sm text-white">
                      {item.description} × {item.quantity}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {formatPrice(lineTotal, invoice.currency ?? "MYR")}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {invoice.notes ? (
            <>
              <Separator className="bg-white/[0.08]" />
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Notes</p>
                <p className="text-sm text-white/75">{invoice.notes}</p>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {tenantId ? (
            <a
              href={`/api/tenants/${tenantId}/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          ) : null}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onEmail(invoice.id)}
            disabled={isMutating}
          >
            <Mail className="h-4 w-4" />
            Email Invoice
          </Button>

          {invoice.status !== "paid" ? (
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onStatusChange(invoice.id, "paid")}
              disabled={isMutating}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Paid
            </Button>
          ) : null}

          {invoice.status !== "void" ? (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => onStatusChange(invoice.id, "void")}
              disabled={isMutating}
            >
              <XCircle className="h-4 w-4" />
              Void
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoicesPage() {
  const { tenantId } = useTenantId();

  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const filters = {
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchTerm.trim() || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const { data: invoices = [], isLoading } = useInvoices(tenantId, filters);
  const { data: selectedInvoice } = useInvoice(tenantId, selectedInvoiceId);

  const createInvoice = useCreateInvoice(tenantId ?? "");
  const emailInvoice = useEmailInvoice(tenantId ?? "");
  const updateInvoice = useUpdateInvoice(tenantId ?? "");

  const isMutating =
    createInvoice.isPending || emailInvoice.isPending || updateInvoice.isPending;

  const stats = useMemo(() => {
    return {
      total: invoices.length,
      draft: invoices.filter((invoice) => invoice.status === "draft").length,
      sent: invoices.filter((invoice) => invoice.status === "sent").length,
      paid: invoices.filter((invoice) => invoice.status === "paid").length,
      void: invoices.filter((invoice) => invoice.status === "void").length,
    };
  }, [invoices]);

  async function handleCreateInvoice(payload: CreateInvoicePayload) {
    if (!tenantId) return;
    await createInvoice.mutateAsync(payload);
  }

  async function handleEmail(invoiceId: string) {
    if (!tenantId) return;
    await emailInvoice.mutateAsync(invoiceId);
  }

  async function handleStatusChange(invoiceId: string, status: InvoiceStatus) {
    if (!tenantId) return;
    await updateInvoice.mutateAsync({ invoiceId, status });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage invoice lifecycle, filtering, and delivery.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Draft" value={stats.draft} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Paid" value={stats.paid} />
        <StatCard label="Void" value={stats.void} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Invoice or member"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <Select
            label="Status"
            value={statusFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Sent", value: "sent" },
              { label: "Paid", value: "paid" },
              { label: "Void", value: "void" },
            ]}
            onChange={(value) => setStatusFilter(value as "all" | InvoiceStatus)}
          />

          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />

          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full bg-white/[0.05]" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <AlertCircle className="h-6 w-6 text-white/30" />
              <p className="text-sm text-white/55">No invoices found for the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-xs text-white/45">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs text-white/45">Member</th>
                    <th className="px-4 py-3 text-left text-xs text-white/45">Date</th>
                    <th className="px-4 py-3 text-left text-xs text-white/45">Amount</th>
                    <th className="px-4 py-3 text-left text-xs text-white/45">Status</th>
                    <th className="px-4 py-3 text-right text-xs text-white/45">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/[0.06]">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/65">
                        {invoice.memberName ?? invoice.memberEmail ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/65">
                        {formatDate(invoice.issueDate ?? invoice.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">
                        {formatPrice(invoice.totalAmount ?? invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => handleEmail(invoice.id)}
                            disabled={isMutating}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </Button>

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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateInvoice}
        isSubmitting={createInvoice.isPending}
      />

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        tenantId={tenantId}
        onClose={() => setSelectedInvoiceId(null)}
        onEmail={handleEmail}
        onStatusChange={handleStatusChange}
        isMutating={isMutating}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <p className="text-xs text-white/45">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
