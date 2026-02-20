"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
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

interface CartItem {
  type: ItemType;
  referenceId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function PosPage() {
  const { tenantId } = useTenantId();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [voucherCode, setVoucherCode] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const transactions = useQuery(
    api.pos.listTransactions,
    tenantId ? { tenantId } : "skip",
  );

  const summary = useQuery(
    api.pos.getDailySummary,
    tenantId ? { tenantId } : "skip",
  );

  const packages = useQuery(
    api.sessionPackages.listByTenant,
    tenantId ? { tenantId } : "skip",
  );

  const services = useQuery(
    api.services.list,
    tenantId ? { tenantId } : "skip",
  );

  const products = useQuery(
    api.products.list,
    tenantId ? { tenantId } : "skip",
  );

  const voucherValidation = useQuery(
    api.vouchers.validateCode,
    tenantId && voucherCode.trim()
      ? { tenantId, code: voucherCode.trim() }
      : "skip",
  );

  const createTransaction = useMutation(api.pos.createTransaction);
  const voidTransaction = useMutation(api.pos.voidTransaction);

  const lookedUpUser = useQuery(
    api.users.getByEmail,
    lookupEmail ? { email: lookupEmail } : "skip",
  );

  function handleLookup() {
    if (!customerEmail.trim()) return;
    setLookupEmail(customerEmail.trim());
  }

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
    if (!tenantId || !lookedUpUser || cart.length === 0) return;
    setProcessing(true);
    try {
      const result = await createTransaction({
        tenantId,
        customerId: lookedUpUser._id,
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
            ? (voucherValidation.voucher._id as GenericId<"vouchers">)
            : undefined,
        notes: notes || undefined,
      });
      setLastReceipt(result.receiptNumber);
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
    setLookupEmail(null);
    setCart([]);
    setPaymentMethod("cash");
    setVoucherCode("");
    setNotes("");
  }

  async function handleVoid(transactionId: GenericId<"posTransactions">) {
    try {
      await voidTransaction({ transactionId });
    } catch (err) {
      console.error("Failed to void transaction:", err);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
            {transactions === undefined
              ? "Loading..."
              : `${transactions.length} recent transactions`}
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setCheckoutOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Transaction
        </Button>
      </div>

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
                  <p className="text-xs text-white/50">Today's Revenue</p>
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
          {transactions === undefined ? (
            <LoadingSkeleton />
          ) : transactions.length === 0 ? (
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
                {transactions.map((tx) => {
                  const PayIcon =
                    PAYMENT_ICON[tx.paymentMethod as PaymentMethod] ??
                    DollarSign;
                  const statusConfig =
                    STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];
                  return (
                    <TableRow
                      key={tx._id}
                      className="border-white/[0.06] hover:bg-white/[0.02]"
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
                      <TableCell className="font-medium text-white">
                        {tx.customerName}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {tx.items.length} item
                        {tx.items.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {formatPrice(tx.total, tx.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-white/70">
                          <PayIcon className="h-3.5 w-3.5 text-white/40" />
                          {tx.paymentMethod.replace("_", " ")}
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
                        {tx.status === "completed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => handleVoid(tx._id)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              Select a customer, add items, and process payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Lookup */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Email</label>
              <div className="flex gap-2">
                <Input
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    setLookupEmail(null);
                  }}
                  type="email"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLookup}
                  disabled={!customerEmail.trim()}
                  className="shrink-0"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {lookupEmail && lookedUpUser === undefined && (
                <p className="text-sm text-white/50">Searching...</p>
              )}
              {lookupEmail && lookedUpUser === null && (
                <p className="text-sm text-yellow-400">
                  No user found with that email.
                </p>
              )}
              {lookedUpUser && (
                <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {(lookedUpUser.name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lookedUpUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lookedUpUser.email}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Items</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {/* Session Packages */}
                {activePackages.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">
                      Packages
                    </p>
                    {activePackages.map((pkg) => (
                      <button
                        key={pkg._id}
                        onClick={() =>
                          addToCart({
                            type: "session_package",
                            referenceId: pkg._id,
                            name: pkg.name,
                            price: pkg.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">
                          {pkg.name}
                        </span>
                        <span className="text-xs text-white/40 shrink-0 ml-2">
                          {formatPrice(pkg.price, pkg.currency ?? "MYR")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Services */}
                {activeServices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">
                      Services
                    </p>
                    {activeServices.slice(0, 5).map((svc: any) => (
                      <button
                        key={svc._id}
                        onClick={() =>
                          addToCart({
                            type: "service",
                            referenceId: svc._id,
                            name: svc.name,
                            price: svc.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">
                          {svc.name}
                        </span>
                        <span className="text-xs text-white/40 shrink-0 ml-2">
                          {formatPrice(svc.price, svc.currency ?? "MYR")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Products */}
                {activeProducts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 font-medium">
                      Products
                    </p>
                    {activeProducts.slice(0, 5).map((prod: any) => (
                      <button
                        key={prod._id}
                        onClick={() =>
                          addToCart({
                            type: "product",
                            referenceId: prod._id,
                            name: prod.name,
                            price: prod.price,
                            quantity: 1,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-white/80 truncate">
                          {prod.name}
                        </span>
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
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {item.name}
                        </p>
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

            {/* Voucher */}
            <Input
              label="Voucher Code (optional)"
              placeholder="e.g., WELCOME20"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            />
            {voucherCode.trim() && voucherValidation && (
              <p
                className={cn(
                  "text-sm",
                  voucherValidation.valid
                    ? "text-emerald-400"
                    : "text-red-400",
                )}
              >
                {voucherValidation.valid
                  ? `Voucher applied: ${voucherValidation.voucher?.type === "percentage" ? `${voucherValidation.voucher.value}% off` : "discount applied"}`
                  : voucherValidation.reason}
              </p>
            )}

            {/* Payment Method */}
            <Select
              label="Payment Method"
              options={PAYMENT_METHOD_OPTIONS}
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            />

            {/* Notes */}
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
              disabled={processing || !lookedUpUser || cart.length === 0}
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
      <p className="text-sm font-medium text-white/50">
        No transactions yet
      </p>
      <p className="text-xs text-white/30 mt-1">
        Transactions will appear here after you process your first sale.
      </p>
    </div>
  );
}
