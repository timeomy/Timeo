"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  cn,
} from "@timeo/ui/web";
import {
  FileText,
  Plus,
  Eye,
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Invoice {
  id: string;
  tenantId: string;
  userId: string | null;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: "draft" | "issued" | "submitted" | "accepted" | "rejected";
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  myinvoisId: string | null;
  createdAt: string;
}

function formatRM(cents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    issued: {
      label: "Issued",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <FileText className="h-3 w-3" />,
    },
    submitted: {
      label: "Submitted",
      className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      icon: <Send className="h-3 w-3" />,
    },
    accepted: {
      label: "Accepted",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const c = config[status] ?? config.draft;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.className,
      )}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function InvoiceDetailModal({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  if (!invoice) return null;
  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={invoice.status} />
            <span className="text-xs text-white/40">
              {new Date(invoice.createdAt).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Line Items
            </p>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-white/40">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {formatRM(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">No line items</p>
            )}
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white">{formatRM(invoice.amount - invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Tax (SST)</span>
              <span className="text-white">{formatRM(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-white">Total</span>
              <span className="text-primary">{formatRM(invoice.amount)}</span>
            </div>
          </div>

          {invoice.myinvoisId && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">
                ✓ Submitted to MyInvois: {invoice.myinvoisId}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={onClose}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {invoice.status === "issued" && (
              <Button className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                Submit to MyInvois
              </Button>
            )}
          </div>
          <p className="text-center text-xs text-white/30">
            MyInvois submission requires LHDN credentials. Coming soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoicesPage() {
  const { tenantId } = useTenantId();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", tenantId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/invoices`,
        { credentials: "include" },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Invoices
          </h1>
          <p className="text-sm text-white/50">
            Manage and submit e-invoices via MyInvois (LHDN)
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* MyInvois notice */}
      <Card className="glass-card border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300">
              Malaysia e-Invoicing (MyInvois) Foundation
            </p>
            <p className="text-xs text-blue-400/70 mt-0.5">
              E-invoicing is mandated by LHDN for businesses in Malaysia. Configure your TIN and
              MyInvois API credentials in Settings → E-Invoicing to enable automated submission.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", count: invoices?.length ?? 0, color: "text-white" },
          { label: "Draft", count: invoices?.filter((i) => i.status === "draft").length ?? 0, color: "text-zinc-400" },
          { label: "Issued", count: invoices?.filter((i) => i.status === "issued").length ?? 0, color: "text-blue-400" },
          { label: "Accepted", count: invoices?.filter((i) => i.status === "accepted").length ?? 0, color: "text-emerald-400" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.count}</p>
              <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-white/[0.04]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                  <Skeleton className="h-4 w-24 bg-white/[0.06]" />
                  <Skeleton className="h-4 w-20 bg-white/[0.06] ml-auto" />
                </div>
              ))}
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <FileText className="h-7 w-7 text-white/20" />
              </div>
              <p className="text-base font-semibold text-white/60">No invoices yet</p>
              <p className="mt-1.5 text-sm text-white/30 max-w-xs">
                Invoices will be generated automatically when payments are completed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                      <FileText className="h-4 w-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(invoice.createdAt).toLocaleDateString("en-MY")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={invoice.status} />
                    <span className="text-sm font-semibold text-white">
                      {formatRM(invoice.amount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
