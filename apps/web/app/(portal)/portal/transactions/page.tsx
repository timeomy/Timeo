"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Separator,
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
  Receipt,
  DollarSign,
  CreditCard,
  QrCode,
  Building2,
  FileText,
  Printer,
} from "lucide-react";

type PaymentMethod = "cash" | "card" | "qr_pay" | "bank_transfer";

const PAYMENT_ICON: Record<PaymentMethod, typeof DollarSign> = {
  cash: DollarSign,
  card: CreditCard,
  qr_pay: QrCode,
  bank_transfer: Building2,
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  qr_pay: "QR Pay",
  bank_transfer: "Bank Transfer",
};

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  voided: {
    label: "Voided",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  refunded: {
    label: "Refunded",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
};

const ITEM_TYPE_LABEL: Record<string, string> = {
  membership: "Membership",
  session_package: "Session Package",
  service: "Service",
  product: "Product",
};

export default function TransactionHistoryPage() {
  const { tenantId, tenant } = useTenantId();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const transactions = useQuery(
    api.pos.listByCustomer,
    tenantId ? { tenantId } : "skip",
  );

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPricePlain(amountCents: number, currency: string) {
    const symbol = currency === "MYR" ? "RM" : currency;
    return `${symbol} ${(amountCents / 100).toFixed(2)}`;
  }

  async function handlePrintReceipt(tx: any) {
    const businessName = tx.tenantName ?? tenant?.name ?? "Business";
    const tenantSlug = tenant?.slug ?? "";
    const eInvoiceUrl = `${window.location.origin}/e-invoice/${tenantSlug}?ref=${encodeURIComponent(tx.receiptNumber)}`;

    // Generate QR code data URL before opening print window
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(eInvoiceUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    } catch {
      // QR generation failed — will show a fallback link
    }

    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;

    const itemRows = tx.items
      .map(
        (item: any) =>
          `<tr>
            <td style="padding:4px 0;font-size:13px;">${item.name}<br/><span style="color:#888;font-size:11px;">${ITEM_TYPE_LABEL[item.type] ?? item.type} &times; ${item.quantity}</span></td>
            <td style="padding:4px 0;font-size:13px;text-align:right;white-space:nowrap;">${formatPricePlain(item.price * item.quantity, tx.currency)}</td>
          </tr>`
      )
      .join("");

    const discountRow =
      tx.discount > 0
        ? `<tr><td style="padding:2px 0;font-size:13px;color:#16a34a;">Discount</td><td style="padding:2px 0;font-size:13px;text-align:right;color:#16a34a;">-${formatPricePlain(tx.discount, tx.currency)}</td></tr>`
        : "";

    const voidedBanner =
      tx.status === "voided"
        ? `<div style="text-align:center;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin-bottom:16px;"><strong style="color:#dc2626;font-size:14px;">VOIDED</strong></div>`
        : "";

    const dateStr = new Date(tx.createdAt).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = new Date(tx.createdAt).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const qrSection = qrDataUrl
      ? `<div class="qr-section">
          <p class="label">e-Invoice</p>
          <div style="display:inline-block;padding:8px;background:white;border-radius:8px;border:1px solid #e5e7eb;">
            <img src="${qrDataUrl}" alt="e-Invoice QR" width="140" height="140" style="display:block;" />
          </div>
          <p>Scan to request an e-Invoice</p>
        </div>`
      : `<div class="qr-section">
          <p class="label">e-Invoice</p>
          <p>Request your e-Invoice at:<br/><a href="${eInvoiceUrl}" style="color:#2563eb;word-break:break-all;">${eInvoiceUrl}</a></p>
        </div>`;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${tx.receiptNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding:24px; max-width:380px; margin:0 auto; color:#111; }
    .header { text-align:center; margin-bottom:20px; }
    .header h1 { font-size:20px; font-weight:700; margin-bottom:2px; }
    .header p { font-size:12px; color:#666; }
    .divider { border:none; border-top:1px dashed #ccc; margin:12px 0; }
    .meta { display:flex; justify-content:space-between; font-size:12px; color:#666; margin-bottom:4px; }
    table { width:100%; border-collapse:collapse; }
    .total-row td { padding-top:8px; font-size:16px; font-weight:700; border-top:1px solid #333; }
    .qr-section { text-align:center; margin-top:20px; padding-top:16px; border-top:1px dashed #ccc; }
    .qr-section p { font-size:11px; color:#888; margin-top:8px; line-height:1.4; }
    .qr-section .label { font-size:12px; font-weight:600; color:#333; margin-bottom:8px; }
    .footer { text-align:center; margin-top:20px; font-size:11px; color:#999; }
    @media print {
      body { padding:0; }
      @page { margin:10mm; size:80mm auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessName}</h1>
    <p>RECEIPT</p>
  </div>

  ${voidedBanner}

  <div class="meta"><span>Receipt #</span><span style="font-family:monospace;font-weight:600;">${tx.receiptNumber}</span></div>
  <div class="meta"><span>Date</span><span>${dateStr} ${timeStr}</span></div>
  <div class="meta"><span>Payment</span><span>${PAYMENT_LABEL[tx.paymentMethod as PaymentMethod] ?? tx.paymentMethod}</span></div>

  <hr class="divider"/>

  <table>
    <thead><tr><th style="text-align:left;font-size:12px;color:#666;padding-bottom:4px;">Item</th><th style="text-align:right;font-size:12px;color:#666;padding-bottom:4px;">Amount</th></tr></thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider"/>

  <table>
    <tbody>
      <tr><td style="padding:2px 0;font-size:13px;color:#666;">Subtotal</td><td style="padding:2px 0;font-size:13px;text-align:right;">${formatPricePlain(tx.subtotal, tx.currency)}</td></tr>
      ${discountRow}
      <tr class="total-row"><td>Total</td><td style="text-align:right;">${formatPricePlain(tx.total, tx.currency)}</td></tr>
    </tbody>
  </table>

  ${qrSection}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px;">Powered by Timeo</p>
  </div>

  <script>setTimeout(function() { window.print(); }, 300);<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  // Group transactions by month
  const grouped = (transactions ?? []).reduce<
    Record<string, typeof transactions>
  >((acc, tx) => {
    const date = new Date(tx.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-MY", {
      month: "long",
      year: "numeric",
    });
    if (!acc[label]) acc[label] = [];
    acc[label]!.push(tx);
    return acc;
  }, {});

  const totalSpent = (transactions ?? [])
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transaction History
        </h1>
        <p className="text-sm text-muted-foreground">
          View your payment receipts and transaction details.
        </p>
      </div>

      {transactions === undefined ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-8 w-8 text-white/20 mb-3" />
            <p className="text-sm font-medium text-white/50">
              No transactions yet
            </p>
            <p className="text-xs text-white/30 mt-1">
              Your payment history will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {transactions.filter((t) => t.status === "completed").length}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPrice(totalSpent, "MYR")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Transaction List */}
          {Object.entries(grouped).map(([monthLabel, txs]) => (
            <div key={monthLabel} className="space-y-3">
              <h3 className="text-sm font-medium text-white/50">
                {monthLabel}
              </h3>
              <div className="space-y-2">
                {txs!.map((tx) => {
                  const PayIcon =
                    PAYMENT_ICON[tx.paymentMethod as PaymentMethod] ?? DollarSign;
                  const statusConfig =
                    STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];

                  return (
                    <Card
                      key={tx._id}
                      className="glass-card cursor-pointer transition-colors hover:bg-white/[0.04]"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="rounded-lg bg-white/[0.04] p-2 shrink-0">
                              <Receipt className="h-4 w-4 text-white/40" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {tx.items
                                  .map((item: any) => item.name)
                                  .join(", ")}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-white/30 font-mono">
                                  {tx.receiptNumber}
                                </span>
                                <span className="text-xs text-white/20">&middot;</span>
                                <span className="text-xs text-white/30">
                                  {formatDate(tx.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig?.className)}
                            >
                              {statusConfig?.label ?? tx.status}
                            </Badge>
                            <p className="text-sm font-bold">
                              {formatPrice(tx.total, tx.currency)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog
        open={!!selectedTx}
        onOpenChange={(open) => { if (!open) setSelectedTx(null); }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedTx && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipt
                </DialogTitle>
                <DialogDescription>
                  #{selectedTx.receiptNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      STATUS_CONFIG[selectedTx.status as keyof typeof STATUS_CONFIG]?.className
                    )}
                  >
                    {STATUS_CONFIG[selectedTx.status as keyof typeof STATUS_CONFIG]?.label ?? selectedTx.status}
                  </Badge>
                  <span className="text-sm text-white/50">
                    {formatDate(selectedTx.createdAt)} at{" "}
                    {formatTime(selectedTx.createdAt)}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-1">Business</p>
                  <p className="text-sm font-medium">{selectedTx.tenantName}</p>
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Items */}
                <div>
                  <p className="text-xs text-white/40 mb-2 font-medium">Items</p>
                  <div className="space-y-2">
                    {selectedTx.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-white/40">
                            {ITEM_TYPE_LABEL[item.type] ?? item.type} &middot; Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity, selectedTx.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/60">
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedTx.subtotal, selectedTx.currency)}</span>
                  </div>
                  {selectedTx.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Discount</span>
                      <span>-{formatPrice(selectedTx.discount, selectedTx.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-white">
                    <span>Total</span>
                    <span>{formatPrice(selectedTx.total, selectedTx.currency)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                  {(() => {
                    const PayIcon = PAYMENT_ICON[selectedTx.paymentMethod as PaymentMethod] ?? DollarSign;
                    return <PayIcon className="h-4 w-4 text-white/40" />;
                  })()}
                  <span className="text-sm">
                    Paid via {PAYMENT_LABEL[selectedTx.paymentMethod as PaymentMethod] ?? selectedTx.paymentMethod}
                  </span>
                </div>

                {selectedTx.staffName && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Processed By</p>
                    <p className="text-sm">{selectedTx.staffName}</p>
                  </div>
                )}

                {/* e-Invoice QR Code */}
                <Separator className="bg-white/[0.06]" />
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-xs font-medium text-white/60">
                    e-Invoice Registration
                  </p>
                  <div className="rounded-lg bg-white p-3">
                    <QRCodeSVG
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/e-invoice/${tenant?.slug ?? ""}?ref=${encodeURIComponent(selectedTx.receiptNumber)}`}
                      size={120}
                      level="M"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 text-center">
                    Scan to request an e-Invoice
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => handlePrintReceipt(selectedTx)}
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
