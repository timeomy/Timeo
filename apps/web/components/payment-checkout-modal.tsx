"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  cn,
} from "@timeo/ui/web";
import {
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  ChevronRight,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";

// Malaysian banks for FPX
const FPX_BANKS = [
  { id: "maybank2u", name: "Maybank2u", logo: "🏦" },
  { id: "cimb", name: "CIMB Clicks", logo: "🏦" },
  { id: "publicbank", name: "Public Bank", logo: "🏦" },
  { id: "rhb", name: "RHB Now", logo: "🏦" },
  { id: "hongleong", name: "Hong Leong Connect", logo: "🏦" },
  { id: "ambank", name: "AmOnline", logo: "🏦" },
  { id: "affin", name: "Affin Online", logo: "🏦" },
  { id: "alliance", name: "Alliance Online", logo: "🏦" },
  { id: "bankislam", name: "Bank Islam", logo: "🏦" },
  { id: "bankrakyat", name: "Bank Rakyat", logo: "🏦" },
  { id: "bsn", name: "BSN", logo: "🏦" },
  { id: "muamalat", name: "Bank Muamalat", logo: "🏦" },
];

type PaymentMethod = "fpx" | "duitnow" | "card" | "cash";

interface CheckoutItem {
  name: string;
  price: number; // in cents
  description?: string;
}

interface PaymentCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  item: CheckoutItem;
  onSuccess?: (method: PaymentMethod, reference?: string) => void;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export function PaymentCheckoutModal({
  open,
  onClose,
  item,
  onSuccess,
}: PaymentCheckoutModalProps) {
  const [step, setStep] = useState<"method" | "details" | "done">("method");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function reset() {
    setStep("method");
    setSelectedMethod(null);
    setSelectedBank(null);
    setProcessing(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelectMethod(method: PaymentMethod) {
    setSelectedMethod(method);
    if (method === "cash") {
      setStep("details");
    } else {
      setStep("details");
    }
  }

  async function handleConfirm() {
    setProcessing(true);
    // Simulate processing
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    setStep("done");
    onSuccess?.(selectedMethod!, selectedBank ?? undefined);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {step === "done" ? "Payment Initiated" : "Checkout"}
          </DialogTitle>
          {step !== "done" && (
            <DialogDescription>
              {item.name} — {formatPrice(item.price)}
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "method" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Select Payment Method
            </p>
            {[
              {
                id: "fpx" as PaymentMethod,
                label: "FPX Online Banking",
                desc: "Pay directly from your bank account",
                icon: <Building2 className="h-5 w-5" />,
                color: "text-blue-400",
              },
              {
                id: "duitnow" as PaymentMethod,
                label: "DuitNow QR",
                desc: "Scan QR code with your banking app",
                icon: <QrCode className="h-5 w-5" />,
                color: "text-green-400",
              },
              {
                id: "card" as PaymentMethod,
                label: "Credit / Debit Card",
                desc: "Visa, Mastercard, American Express",
                icon: <CreditCard className="h-5 w-5" />,
                color: "text-purple-400",
              },
              {
                id: "cash" as PaymentMethod,
                label: "Cash",
                desc: "Pay at the front desk",
                icon: <Banknote className="h-5 w-5" />,
                color: "text-yellow-400",
              },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => handleSelectMethod(method.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.07] hover:border-white/[0.15]"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]",
                    method.color,
                  )}
                >
                  {method.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {method.label}
                  </p>
                  <p className="text-xs text-white/40">{method.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            ))}
          </div>
        )}

        {step === "details" && selectedMethod === "fpx" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("method")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <p className="text-sm font-medium text-white">
              Select Your Bank
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {FPX_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={cn(
                    "rounded-xl border p-3 text-xs font-medium text-left transition-all",
                    selectedBank === bank.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07]",
                  )}
                >
                  {bank.name}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-xs text-white/40">
                ⚠️ Payment gateway integration requires API keys. This is a UI preview — no actual payment will be processed.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleConfirm}
                disabled={!selectedBank || processing}
                className="w-full gap-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                {processing ? "Processing..." : `Pay ${formatPrice(item.price)}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "details" && selectedMethod === "duitnow" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("method")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-primary/30 bg-white p-3">
                <div className="flex flex-col items-center gap-2 text-gray-800">
                  <QrCode className="h-24 w-24 text-primary" />
                  <p className="text-xs font-medium text-gray-500">DuitNow QR</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {formatPrice(item.price)}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Scan with any DuitNow-enabled banking app
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 w-full">
                <p className="text-xs text-white/40 text-center">
                  ⚠️ QR code generation requires payment gateway integration.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirm} className="w-full gap-2" disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {processing ? "Confirming..." : "I've Paid"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "details" && selectedMethod === "card" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("method")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/60"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/60"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/60"
                    readOnly
                  />
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/40">
                  ⚠️ Card payment requires Stripe or payment gateway integration.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirm} className="w-full gap-2" disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {processing ? "Processing..." : `Pay ${formatPrice(item.price)}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "details" && selectedMethod === "cash" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("method")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center space-y-3">
              <Banknote className="mx-auto h-10 w-10 text-yellow-400" />
              <div>
                <p className="text-base font-semibold text-white">Pay at Counter</p>
                <p className="text-sm text-white/50 mt-1">
                  Please visit the front desk and make a cash payment of{" "}
                  <span className="font-bold text-yellow-400">
                    {formatPrice(item.price)}
                  </span>
                </p>
              </div>
              <p className="text-xs text-white/30">
                Your booking will be confirmed once payment is received.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirm} className="w-full gap-2" disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {processing ? "Confirming..." : "Confirm Cash Payment"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Payment Request Submitted
              </p>
              <p className="text-sm text-white/50 mt-1">
                {selectedMethod === "cash"
                  ? "Please pay at the front desk. Your request is pending confirmation."
                  : "Your payment is being processed. You'll receive confirmation shortly."}
              </p>
            </div>
            <DialogFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
