"use client";

import { useState, useRef, useCallback } from "react";
import {
  usePosTransactions,
  useCreatePosTransaction,
  useVoidPosTransaction,
  useDeletePosTransaction,
  useDailySummary,
  useMonthlyStatement,
  useSessionPackages,
  useServices,
  useProducts,
  useValidateVoucher,
} from "@timeo/api-client";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import { useTimeoWebAuthContext, isRoleAtLeast } from "@timeo/auth/web";
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  Store,
  Plus,
  Search,
  Receipt,
  Ban,
  DollarSign,
  CreditCard,
  QrCode,
  Building2,
  AlertCircle,
  Trash2,
  Eye,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
} from "lucide-react";

type PaymentMethod = "cash" | "card" | "qr_pay" | "bank_transfer";
type ItemType = "membership" | "session_package" | "service" | "product";

const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "QR Pay", value: "qr_pay" },
  { label: "Bank Transfer", value: "bank_transfer" },
];

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

interface CartItem {
  type: ItemType;
  referenceId: string;
  name: string;
  price: number;
  quantity: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMode = "transactions" | "statement";

export default function PosPage() {
  const { tenantId, tenant } = useTenantId();
  const { activeRole } = useTimeoWebAuthContext();
  const isAdmin = isRoleAtLeast(activeRole, "admin");

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("transactions");

  // Transaction list state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [voucherCode, setVoucherCode] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  // Detail dialog
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Void dialog
  const [voidTarget, setVoidTarget] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Statement state
  const now = new Date();
  const [statementYear, setStatementYear] = useState(now.getFullYear());
  const [statementMonth, setStatementMonth] = useState(now.getMonth());

  const { data: transactions, isLoading: txLoading } = usePosTransactions(tenantId ?? "");

  const { data: summary } = useDailySummary(tenantId ?? "");

  const { data: statement, isLoading: statementLoading } = useMonthlyStatement(
    tenantId ?? "",
    viewMode === "statement" ? { year: statementYear, month: statementMonth } : undefined,
  );

  const { data: packages } = useSessionPackages(tenantId ?? "");
  const { data: services } = useServices(tenantId ?? "");
  const { data: products } = useProducts(tenantId ?? "");

  const { data: voucherValidation } = useValidateVoucher(
    tenantId ?? "",
    voucherCode.trim() ? { code: voucherCode.trim() } : undefined,
  );

  const { mutateAsync: createTransaction } = useCreatePosTransaction(tenantId ?? "");
  const { mutateAsync: voidTransaction } = useVoidPosTransaction(tenantId ?? "");
  const { mutateAsync: deleteTransaction } = useDeletePosTransaction(tenantId ?? "");

  function addToCart(item: CartItem) {
    const existing = cart.find(
      (c) => c.referenceId === item.referenceId && c.type === item.type,
    );
    if (existing) {
      setCart(
        cart.map((c) =>
          c.referenceId === item.referenceId && c.type === item.type
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        ),
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount =
    voucherValidation?.valid && voucherValidation.voucher
      ? voucherValidation.voucher.type === "percentage"
        ? Math.round((subtotal * voucherValidation.voucher.value) / 100)
        : voucherValidation.voucher.type === "fixed"
          ? Math.min(voucherValidation.voucher.value, subtotal)
          : subtotal
      : 0;
  const total = Math.max(0, subtotal - discount);

  async function handleCheckout() {
    if (!tenantId || !customerEmail.trim() || cart.length === 0) return;
    setProcessing(true);
    try {
      const result = await createTransaction({
        customerEmail: customerEmail.trim(),
        items: cart.map((item) => ({
          type: item.type,
          referenceId: item.referenceId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        paymentMethod,
        discount: discount > 0 ? discount : undefined,
        voucherId:
          voucherValidation?.valid && voucherValidation.voucher
            ? voucherValidation.voucher.id
            : undefined,
        notes: notes || undefined,
      });
      setLastReceipt(result.receiptNumber ?? null);
      setCheckoutOpen(false);
      resetCheckout();
    } catch (err) {
      console.error("Failed to process transaction:", err);
    } finally {
      setProcessing(false);
    }
  }

  function resetCheckout() {
    setCustomerEmail("");
    setCart([]);
    setPaymentMethod("cash");
    setVoucherCode("");
    setNotes("");
  }

  async function handleVoid() {
    if (!voidTarget || !tenantId) return;
    try {
      await voidTransaction({
        transactionId: voidTarget.id,
        reason: voidReason || undefined,
      });
      setVoidTarget(null);
      setVoidReason("");
      if (selectedTx?.id === voidTarget.id) setSelectedTx(null);
    } catch (err) {
      console.error("Failed to void transaction:", err);
    }
  }

  async function handleDelete(transactionId: string) {
    if (!tenantId) return;
    try {
      await deleteTransaction(transactionId);
      if (selectedTx?.id === transactionId) setSelectedTx(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  }

  async function handlePrintReceipt(tx: any, businessName: string) {
    const eInvoiceUrl = `${window.location.origin}/e-invoice/${tenant?.slug ?? ""}?ref=${encodeURIComponent(tx.receiptNumber)}`;

    // Generate QR code data URL before opening the print window
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
  <div class="meta"><span>Customer</span><span>${tx.customerName}</span></div>
  <div class="meta"><span>Staff</span><span>${tx.staffName}</span></div>
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

  ${tx.notes ? `<hr class="divider"/><p style="font-size:12px;color:#666;"><strong>Notes:</strong> ${tx.notes}</p>` : ""}

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

  function formatPricePlain(amountCents: number, currency: string) {
    const symbol = currency === "MYR" ? "RM" : currency;
    return `${symbol} ${(amountCents / 100).toFixed(2)}`;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function prevMonth() {
    if (statementMonth === 0) {
      setStatementMonth(11);
      setStatementYear(statementYear - 1);
    } else {
      setStatementMonth(statementMonth - 1);
    }
  }

  function nextMonth() {
    if (statementMonth === 11) {
      setStatementMonth(0);
      setStatementYear(statementYear + 1);
    } else {
      setStatementMonth(statementMonth + 1);
    }
  }

  const activePackages = packages?.filter((p) => p.isActive) ?? [];
  const activeServices = services?.filter((s: any) => s.isActive) ?? [];
  const activeProducts = products?.filter((p: any) => p.isActive) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Point of Sale
          </h1>
          <p className="text-sm text-white/50">
            {txLoading
              ? "Loading..."
              : `${transactions?.length ?? 0} recent transactions`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode("transactions")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "transactions"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/50 hover:text-white"
              )}
            >
              Transactions
            </button>
            <button
              onClick={() => setViewMode("statement")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "statement"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/50 hover:text-white"
              )}
            >
              Statement
            </button>
          </div>
          <Button className="gap-2" onClick={() => setCheckoutOpen(true)}>
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {viewMode === "transactions" ? (
        <>
          {/* Daily Summary */}
          {summary && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/10 p-2">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {formatPrice(summary.totalRevenue, "MYR")}
                      </p>
                      <p className="text-xs text-white/50">Today&apos;s Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Receipt className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {summary.totalTransactions}
                      </p>
                      <p className="text-xs text-white/50">Transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-500/10 p-2">
                      <Store className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {formatPrice(summary.totalDiscount, "MYR")}
                      </p>
                      <p className="text-xs text-white/50">Discounts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-500/10 p-2">
                      <Ban className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {summary.voidedCount}
                      </p>
                      <p className="text-xs text-white/50">Voided</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Receipt Toast */}
          {lastReceipt && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <Receipt className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-emerald-400">
                Transaction completed! Receipt: <strong>{lastReceipt}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-white/60"
                onClick={() => setLastReceipt(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Recent Transactions */}
          <Card className="glass-card">
            <CardContent className="p-0">
              {txLoading ? (
                <LoadingSkeleton />
              ) : (transactions?.length ?? 0) === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Receipt</TableHead>
                      <TableHead className="text-white/50">Customer</TableHead>
                      <TableHead className="text-white/50">Items</TableHead>
                      <TableHead className="text-white/50">Total</TableHead>
                      <TableHead className="text-white/50">Payment</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                      <TableHead className="text-right text-white/50">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions!.map((tx) => {
                      const PayIcon =
                        PAYMENT_ICON[tx.paymentMethod as PaymentMethod] ??
                        DollarSign;
                      const statusConfig =
                        STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];
                      return (
                        <TableRow
                          key={tx.id}
                          className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer"
                          onClick={() => setSelectedTx(tx)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-medium text-white">
                                {tx.receiptNumber}
                              </span>
                              <span className="text-xs text-white/30">
                                {formatDate(tx.createdAt)}{" "}
                                {formatTime(tx.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white">
                                {tx.customerName}
                              </span>
                              {tx.customerEmail && (
                                <span className="text-xs text-white/30">
                                  {tx.customerEmail}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white/70">
                            {(tx.items ?? []).length} item
                            {(tx.items ?? []).length !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {formatPrice(tx.total ?? 0, tx.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-white/70">
                              <PayIcon className="h-3.5 w-3.5 text-white/40" />
                              {PAYMENT_LABEL[tx.paymentMethod as PaymentMethod] ?? tx.paymentMethod}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig?.className)}
                            >
                              {statusConfig?.label ?? tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
                                onClick={() => setSelectedTx(tx)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {tx.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                                  onClick={() => setVoidTarget(tx)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Void
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={() => handleDelete(tx.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Statement View */
        <StatementView
          statement={statement}
          isLoading={statementLoading}
          year={statementYear}
          month={statementMonth}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          isAdmin={isAdmin}
        />
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
                  Transaction Details
                </DialogTitle>
                <DialogDescription>
                  Receipt #{selectedTx.receiptNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status & Date */}
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

                {/* Customer & Staff */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Customer</p>
                    <p className="text-sm font-medium">{selectedTx.customerName}</p>
                    {selectedTx.customerEmail && (
                      <p className="text-xs text-white/40">{selectedTx.customerEmail}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Processed By</p>
                    <p className="text-sm font-medium">{selectedTx.staffName}</p>
                  </div>
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

                {selectedTx.notes && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Notes</p>
                    <p className="text-sm text-white/70">{selectedTx.notes}</p>
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
                  onClick={() =>
                    handlePrintReceipt(selectedTx, tenant?.name ?? "Business")
                  }
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </Button>
                {selectedTx.status === "completed" && (
                  <Button
                    variant="outline"
                    className="gap-1 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                    onClick={() => {
                      setVoidTarget(selectedTx);
                      setSelectedTx(null);
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    Void
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      handleDelete(selectedTx.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedTx(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This will mark transaction {voidTarget?.receiptNumber} as voided.
              The record will remain visible but the amount will no longer count
              toward revenue.
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Reason (optional)"
            placeholder="e.g., Customer requested cancellation"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoidTarget(null);
                setVoidReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-yellow-600 text-white hover:bg-yellow-700"
              onClick={handleVoid}
            >
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Transaction Dialog */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) resetCheckout();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Enter the customer email, add items, and process payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Email</label>
              <Input
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                type="email"
              />
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Items</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {activePackages.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">Packages</p>
                    {activePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() =>
                          addToCart({
                            type: "session_package",
                            referenceId: pkg.id,
                            name: pkg.name,
                            price: pkg.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">{pkg.name}</span>
                        <span className="text-xs text-white/40 shrink-0 ml-2">
                          {formatPrice(pkg.price, pkg.currency ?? "MYR")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {activeServices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">Services</p>
                    {activeServices.slice(0, 5).map((svc: any) => (
                      <button
                        key={svc.id}
                        onClick={() =>
                          addToCart({
                            type: "service",
                            referenceId: svc.id,
                            name: svc.name,
                            price: svc.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">{svc.name}</span>
                        <span className="text-xs text-white/40 shrink-0 ml-2">
                          {formatPrice(svc.price, svc.currency ?? "MYR")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {activeProducts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">Products</p>
                    {activeProducts.slice(0, 5).map((prod: any) => (
                      <button
                        key={prod.id}
                        onClick={() =>
                          addToCart({
                            type: "product",
                            referenceId: prod.id,
                            name: prod.name,
                            price: prod.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">{prod.name}</span>
                        <span className="text-xs text-white/40 shrink-0 ml-2">
                          {formatPrice(prod.price, prod.currency ?? "MYR")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cart</label>
                <div className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.06]">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-white/40">
                          {formatPrice(item.price, "MYR")} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {formatPrice(item.price * item.quantity, "MYR")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/10"
                          onClick={() => removeFromCart(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex justify-between text-sm text-white/60">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal, "MYR")}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-400">
                        <span>Discount</span>
                        <span>-{formatPrice(discount, "MYR")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-white">
                      <span>Total</span>
                      <span>{formatPrice(total, "MYR")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Input
              label="Voucher Code (optional)"
              placeholder="e.g., WELCOME20"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            />
            {voucherCode.trim() && voucherValidation && (
              <p className={cn("text-sm", voucherValidation.valid ? "text-emerald-400" : "text-red-400")}>
                {voucherValidation.valid
                  ? `Voucher applied: ${voucherValidation.voucher?.type === "percentage" ? `${voucherValidation.voucher.value}% off` : "discount applied"}`
                  : voucherValidation.reason}
              </p>
            )}

            <Select
              label="Payment Method"
              options={PAYMENT_METHOD_OPTIONS}
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            />

            <Input
              label="Notes (optional)"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={processing || !customerEmail.trim() || cart.length === 0}
            >
              {processing
                ? "Processing..."
                : `Charge ${formatPrice(total, "MYR")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Statement View ─────────────────────────────────────────────────────
function StatementView({
  statement,
  isLoading,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  isAdmin,
}: {
  statement: any;
  isLoading: boolean;
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isAdmin: boolean;
}) {
  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">
            {MONTH_NAMES[month]} {year}
          </h2>
          <p className="text-xs text-white/50">Monthly Statement</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-white/[0.06] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Revenue</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatPrice(statement?.totalRevenue ?? 0, "MYR")}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Transactions</p>
                <p className="text-xl font-bold text-white">
                  {statement?.totalTransactions ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Discounts</p>
                <p className="text-xl font-bold text-yellow-400">
                  {formatPrice(statement?.totalDiscount ?? 0, "MYR")}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Voided</p>
                <p className="text-xl font-bold text-red-400">
                  {statement?.voidedCount ?? 0} ({formatPrice(statement?.voidedTotal ?? 0, "MYR")})
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white/60 mb-3">By Payment Method</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(statement?.byPaymentMethod ?? {}).map(([method, amount]) => (
                  <div key={method} className="flex items-center gap-2">
                    {(() => {
                      const Icon = PAYMENT_ICON[method as PaymentMethod] ?? DollarSign;
                      return <Icon className="h-4 w-4 text-white/40" />;
                    })()}
                    <div>
                      <p className="text-xs text-white/40">
                        {PAYMENT_LABEL[method as PaymentMethod] ?? method}
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(amount as number, "MYR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Item Type Breakdown */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white/60 mb-3">By Category</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(statement?.byItemType ?? {}).map(([type, amount]) => (
                  <div key={type}>
                    <p className="text-xs text-white/40">
                      {ITEM_TYPE_LABEL[type] ?? type}
                    </p>
                    <p className="text-sm font-medium">
                      {formatPrice(amount as number, "MYR")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          <Card className="glass-card">
            <CardContent className="p-0">
              {(statement?.transactions?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-6 w-6 text-white/30 mb-2" />
                  <p className="text-sm text-white/50">No transactions this month</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Date</TableHead>
                      <TableHead className="text-white/50">Receipt</TableHead>
                      <TableHead className="text-white/50">Customer</TableHead>
                      <TableHead className="text-white/50">Total</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement!.transactions.map((tx: any) => {
                      const statusConfig =
                        STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];
                      return (
                        <TableRow
                          key={tx.id}
                          className="border-white/[0.06] hover:bg-white/[0.02]"
                        >
                          <TableCell className="text-white/70">
                            {formatDate(tx.createdAt)} {formatTime(tx.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-white">
                            {tx.receiptNumber}
                          </TableCell>
                          <TableCell className="text-white">
                            {tx.customerName}
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {formatPrice(tx.total ?? 0, tx.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig?.className)}
                            >
                              {statusConfig?.label ?? tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-7 w-16 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No transactions yet</p>
      <p className="text-xs text-white/30 mt-1">
        Transactions will appear here after you process your first sale.
      </p>
    </div>
  );
}
