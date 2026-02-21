"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Separator,
  cn,
} from "@timeo/ui/web";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
} from "lucide-react";

const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
  "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah",
  "Sarawak", "Selangor", "Terengganu",
  "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

const STATE_OPTIONS = MY_STATES.map((s) => ({ label: s, value: s }));

const ID_TYPE_OPTIONS = [
  { label: "NRIC (MyKad)", value: "nric" },
  { label: "Passport", value: "passport" },
  { label: "Business Registration No.", value: "brn" },
  { label: "Army ID", value: "army" },
];

type IdType = "nric" | "passport" | "brn" | "army";

export default function EInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const refParam = searchParams.get("ref") ?? "";

  // Step state
  const [step, setStep] = useState<"lookup" | "form" | "success">("lookup");

  // Lookup
  const [receiptInput, setReceiptInput] = useState(refParam);
  const [lookupRef, setLookupRef] = useState(refParam || "");

  // Form
  const [buyerTin, setBuyerTin] = useState("");
  const [buyerIdType, setBuyerIdType] = useState<IdType>("nric");
  const [buyerIdValue, setBuyerIdValue] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [sstRegNo, setSstRegNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const receiptData = useQuery(
    api.eInvoice.lookupReceipt,
    lookupRef
      ? { tenantSlug, receiptNumber: lookupRef }
      : "skip"
  );

  const submitRequest = useMutation(api.eInvoice.submitRequest);

  // Auto-advance to form when receipt found
  useEffect(() => {
    if (receiptData?.found && !receiptData.alreadySubmitted && step === "lookup") {
      setStep("form");
    }
  }, [receiptData, step]);

  // Auto-lookup if ref param provided
  useEffect(() => {
    if (refParam && !lookupRef) {
      setLookupRef(refParam);
    }
  }, [refParam, lookupRef]);

  function handleLookup() {
    if (!receiptInput.trim()) return;
    setLookupRef(receiptInput.trim().toUpperCase());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptData?.found || !lookupRef) return;

    setSubmitting(true);
    setError("");

    try {
      await submitRequest({
        tenantSlug,
        receiptNumber: lookupRef,
        buyerTin: buyerTin.trim(),
        buyerIdType,
        buyerIdValue: buyerIdValue.trim(),
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: buyerPhone.trim() || undefined,
        buyerAddress: {
          line1: addressLine1.trim(),
          line2: addressLine2.trim() || undefined,
          city: city.trim(),
          state,
          postcode: postcode.trim(),
          country: "MYS",
        },
        buyerSstRegNo: sstRegNo.trim() || undefined,
      });
      setStep("success");
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-card/50">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">
              {receiptData?.tenantName ?? tenantSlug}
            </p>
            <p className="text-xs text-muted-foreground">e-Invoice Request</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {step === "success" ? (
          /* ── Success ─────────────────────────────────────── */
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 rounded-full bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                e-Invoice Request Submitted
              </h2>
              <p className="text-sm text-white/50 max-w-sm">
                Your e-invoice request for receipt <strong>{lookupRef}</strong>{" "}
                has been submitted successfully. The business will process and
                submit your e-invoice to LHDN MyInvois.
              </p>
              <p className="mt-4 text-xs text-white/30">
                You will be notified at <strong>{buyerEmail}</strong> once
                processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Receipt Lookup ──────────────────────────── */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                e-Invoice Request
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your receipt number to request an e-invoice from{" "}
                {receiptData?.tenantName ?? tenantSlug}.
              </p>
            </div>

            <Card className="glass-card mb-6">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. WSFI-M4X7K9-AB3D"
                    value={receiptInput}
                    onChange={(e) => {
                      setReceiptInput(e.target.value.toUpperCase());
                      if (lookupRef) setLookupRef("");
                      setStep("lookup");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={!receiptInput.trim()}
                    className="shrink-0 gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Find
                  </Button>
                </div>

                {/* Receipt result */}
                {lookupRef && receiptData === undefined && (
                  <p className="mt-3 text-sm text-white/50">
                    Looking up receipt...
                  </p>
                )}
                {lookupRef && receiptData === null && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    Receipt not found. Please check the number and try again.
                  </div>
                )}
                {receiptData?.alreadySubmitted && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    An e-invoice request has already been submitted for this
                    receipt
                    {receiptData.existingStatus === "submitted"
                      ? " and has been processed."
                      : "."}
                  </div>
                )}
                {receiptData?.found && !receiptData.alreadySubmitted && (
                  <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-white/40" />
                        <span className="text-sm font-mono font-medium">
                          {receiptData.receiptNumber}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          receiptData.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border-red-500/30"
                        )}
                      >
                        {receiptData.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-white/40 mb-2">
                      {formatDate(receiptData.date)}
                    </div>
                    {receiptData.items.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm py-0.5"
                      >
                        <span className="text-white/70">
                          {item.name} x{item.quantity}
                        </span>
                        <span>
                          {formatPrice(
                            item.price * item.quantity,
                            receiptData.currency
                          )}
                        </span>
                      </div>
                    ))}
                    <Separator className="my-2 bg-white/[0.06]" />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>
                        {formatPrice(receiptData.total, receiptData.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Buyer Details Form ─────────────────────── */}
            {step === "form" && receiptData?.found && !receiptData.alreadySubmitted && (
              <form onSubmit={handleSubmit}>
                <Card className="glass-card">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">
                        Buyer Details
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Fill in your details for e-invoice generation. This
                        information will be submitted to LHDN.
                      </p>
                    </div>

                    <Separator className="bg-white/[0.06]" />

                    {/* TIN */}
                    <Input
                      label="Tax Identification Number (TIN) *"
                      placeholder="e.g. C12345678090"
                      value={buyerTin}
                      onChange={(e) => setBuyerTin(e.target.value.toUpperCase())}
                      required
                    />

                    {/* ID Type + Value */}
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="ID Type *"
                        options={ID_TYPE_OPTIONS}
                        value={buyerIdType}
                        onChange={(val) => setBuyerIdType(val as IdType)}
                      />
                      <Input
                        label="ID Number *"
                        placeholder={
                          buyerIdType === "nric"
                            ? "e.g. 900101-01-1234"
                            : buyerIdType === "brn"
                              ? "e.g. 202001012345"
                              : "ID number"
                        }
                        value={buyerIdValue}
                        onChange={(e) => setBuyerIdValue(e.target.value)}
                        required
                      />
                    </div>

                    {/* Name */}
                    <Input
                      label="Full Name / Company Name *"
                      placeholder="As per IC or SSM registration"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                    />

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Email *"
                        type="email"
                        placeholder="your@email.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        required
                      />
                      <Input
                        label="Phone (optional)"
                        type="tel"
                        placeholder="e.g. 012-3456789"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                      />
                    </div>

                    <Separator className="bg-white/[0.06]" />

                    {/* Address */}
                    <p className="text-xs font-medium text-white/60">Address</p>
                    <Input
                      label="Address Line 1 *"
                      placeholder="Street address"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      required
                    />
                    <Input
                      label="Address Line 2"
                      placeholder="Apartment, unit, etc. (optional)"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="City *"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                      <Select
                        label="State *"
                        options={STATE_OPTIONS}
                        value={state}
                        onChange={(val) => setState(val)}
                      />
                      <Input
                        label="Postcode *"
                        placeholder="e.g. 50000"
                        value={postcode}
                        onChange={(e) =>
                          setPostcode(e.target.value.replace(/\D/g, ""))
                        }
                        required
                      />
                    </div>

                    {/* SST (optional) */}
                    <Input
                      label="SST Registration No. (optional)"
                      placeholder="If applicable"
                      value={sstRegNo}
                      onChange={(e) => setSstRegNo(e.target.value)}
                    />

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={
                        submitting ||
                        !buyerTin.trim() ||
                        !buyerIdValue.trim() ||
                        !buyerName.trim() ||
                        !buyerEmail.trim() ||
                        !addressLine1.trim() ||
                        !city.trim() ||
                        !state ||
                        !postcode.trim()
                      }
                    >
                      <FileText className="h-4 w-4" />
                      {submitting
                        ? "Submitting..."
                        : "Submit e-Invoice Request"}
                    </Button>
                  </CardContent>
                </Card>

                <p className="mt-4 text-center text-xs text-white/30">
                  Your information will be used solely for e-invoice generation
                  and submission to LHDN MyInvois as required by Malaysian tax
                  regulations.
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
