"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  FileText,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Building2,
  Clock,
  Copy,
  ExternalLink,
} from "lucide-react";

// ─── MSIC Codes ─────────────────────────────────────────────────────

const MSIC_OPTIONS = [
  { code: "47111", description: "Provision stores" },
  { code: "47112", description: "Supermarket" },
  { code: "47113", description: "Mini market" },
  { code: "47114", description: "Convenience stores" },
  { code: "47191", description: "Department stores" },
  { code: "47912", description: "Retail sale via Internet" },
  { code: "56101", description: "Restaurants" },
  { code: "56102", description: "Cafeterias / canteens" },
  { code: "56103", description: "Fast-food restaurants" },
  { code: "56106", description: "Food stalls / hawkers" },
  { code: "55101", description: "Hotels and resort hotels" },
  { code: "96020", description: "Hairdressing and other beauty treatment" },
  { code: "96091", description: "Sauna, steam baths, massage salons" },
  { code: "93118", description: "Fitness centres" },
  { code: "93111", description: "Sports facilities (football, badminton, etc.)" },
  { code: "93120", description: "Operation of sports clubs" },
  { code: "86201", description: "General medical services" },
  { code: "86202", description: "Specialized medical services" },
  { code: "86203", description: "Dental services" },
  { code: "85491", description: "Tuition centre" },
  { code: "62010", description: "Computer programming activities" },
  { code: "62021", description: "Computer consultancy" },
  { code: "69100", description: "Legal activities" },
  { code: "69200", description: "Accounting, bookkeeping, auditing, tax consultancy" },
  { code: "70201", description: "Business management consultancy" },
  { code: "74200", description: "Photographic activities" },
  { code: "74102", description: "Graphic design services" },
  { code: "82301", description: "Event organization and management" },
  { code: "45201", description: "Motor vehicle repair and maintenance" },
].map((m) => ({
  label: `${m.code} - ${m.description}`,
  value: m.code,
  description: m.description,
}));

const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
  "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah",
  "Sarawak", "Selangor", "Terengganu",
  "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

const STATE_OPTIONS = MY_STATES.map((s) => ({ label: s, value: s }));

const ID_TYPE_OPTIONS = [
  { label: "Business Registration No. (SSM)", value: "brn" },
  { label: "NRIC (MyKad)", value: "nric" },
  { label: "Passport", value: "passport" },
  { label: "Army ID", value: "army" },
];

type IdType = "brn" | "nric" | "passport" | "army";
type TabMode = "profile" | "requests";

const REQUEST_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    icon: Clock,
  },
  submitted: {
    label: "Submitted",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: XCircle,
  },
};

export default function EInvoiceSettingsPage() {
  const { tenantId, tenant } = useTenantId();
  const [tab, setTab] = useState<TabMode>("profile");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            e-Invoice
          </h1>
          <p className="text-sm text-white/50">
            Manage your LHDN MyInvois taxpayer profile and e-invoice requests.
          </p>
        </div>
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            onClick={() => setTab("profile")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "profile"
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:text-white"
            )}
          >
            Taxpayer Profile
          </button>
          <button
            onClick={() => setTab("requests")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "requests"
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:text-white"
            )}
          >
            Requests
          </button>
        </div>
      </div>

      {tab === "profile" ? (
        <TaxpayerProfileSection tenantId={tenantId} tenant={tenant} />
      ) : (
        <RequestsSection tenantId={tenantId} />
      )}
    </div>
  );
}

// ─── Taxpayer Profile ───────────────────────────────────────────────

function TaxpayerProfileSection({
  tenantId,
  tenant,
}: {
  tenantId: any;
  tenant: any;
}) {
  const profile = useQuery(
    api.eInvoice.getTaxpayerProfile,
    tenantId ? { tenantId } : "skip"
  );
  const saveProfile = useMutation(api.eInvoice.saveTaxpayerProfile);

  const [taxpayerName, setTaxpayerName] = useState("");
  const [tin, setTin] = useState("");
  const [msicCode, setMsicCode] = useState("");
  const [idType, setIdType] = useState<IdType>("brn");
  const [idNumber, setIdNumber] = useState("");
  const [sstRegNo, setSstRegNo] = useState("");
  const [tourismRegNo, setTourismRegNo] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [lhdnClientId, setLhdnClientId] = useState("");
  const [lhdnClientSecret, setLhdnClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Populate form from existing profile
  useEffect(() => {
    if (profile) {
      setTaxpayerName(profile.taxpayerName ?? "");
      setTin(profile.tin ?? "");
      setMsicCode(profile.msicCode ?? "");
      setIdType((profile.idType as IdType) ?? "brn");
      setIdNumber(profile.idNumber ?? "");
      setSstRegNo(profile.sstRegNo ?? "");
      setTourismRegNo(profile.tourismRegNo ?? "");
      setAddressLine1(profile.address?.line1 ?? "");
      setAddressLine2(profile.address?.line2 ?? "");
      setAddressLine3(profile.address?.line3 ?? "");
      setCity(profile.address?.city ?? "");
      setState(profile.address?.state ?? "");
      setPostcode(profile.address?.postcode ?? "");
      setNotificationEmail(profile.notificationEmail ?? "");
      setNotificationPhone(profile.notificationPhone ?? "");
      setLhdnClientId(profile.lhdnClientId ?? "");
      setLhdnClientSecret(profile.lhdnClientSecret ?? "");
    }
  }, [profile]);

  const eInvoiceUrl =
    typeof window !== "undefined" && tenant?.slug
      ? `${window.location.origin}/e-invoice/${tenant.slug}`
      : "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const msicDesc = MSIC_OPTIONS.find(
        (m) => m.value === msicCode
      )?.description;

      await saveProfile({
        tenantId,
        taxpayerName: taxpayerName.trim(),
        tin: tin.trim(),
        msicCode,
        msicDescription: msicDesc,
        idType,
        idNumber: idNumber.trim(),
        sstRegNo: sstRegNo.trim() || undefined,
        tourismRegNo: tourismRegNo.trim() || undefined,
        address: {
          line1: addressLine1.trim(),
          line2: addressLine2.trim() || undefined,
          line3: addressLine3.trim() || undefined,
          city: city.trim(),
          state,
          postcode: postcode.trim(),
          country: "MYS",
        },
        notificationEmail: notificationEmail.trim(),
        notificationPhone: notificationPhone.trim(),
        lhdnClientId: lhdnClientId.trim() || undefined,
        lhdnClientSecret: lhdnClientSecret.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined && tenantId) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-white/[0.06] rounded-xl" />
        ))}
      </div>
    );
  }

  const isConfigured = !!profile;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* e-Invoice Link */}
      {tenant?.slug && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">
                  Customer e-Invoice Form
                </p>
                <p className="text-xs text-white/40">
                  Share this link or QR code with customers so they can request
                  e-invoices for their receipts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(eInvoiceUrl);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(eInvoiceUrl, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2">
              <code className="text-xs text-white/60 break-all">
                {eInvoiceUrl}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Information */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">General Information</h3>
              <p className="text-xs text-muted-foreground">
                Fill in your company&apos;s taxpayer profile for LHDN MyInvois.
              </p>
            </div>
            {isConfigured && (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              >
                Configured
              </Badge>
            )}
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Taxpayer Name *"
              placeholder="As registered with LHDN"
              value={taxpayerName}
              onChange={(e) => setTaxpayerName(e.target.value)}
              required
            />
            <Input
              label="Tax Identification Number (TIN) *"
              placeholder="e.g. C12345678090"
              value={tin}
              onChange={(e) => setTin(e.target.value.toUpperCase())}
              required
            />
            <Select
              label="MSIC Code *"
              options={MSIC_OPTIONS}
              value={msicCode}
              onChange={(val) => setMsicCode(val)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="ID Type *"
              options={ID_TYPE_OPTIONS}
              value={idType}
              onChange={(val) => setIdType(val as IdType)}
            />
            <Input
              label="ID Number *"
              placeholder={
                idType === "brn"
                  ? "e.g. 202001012345 (SSM No.)"
                  : idType === "nric"
                    ? "e.g. 900101-01-1234"
                    : "ID number"
              }
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="SST Registration No. (optional)"
              placeholder="If applicable"
              value={sstRegNo}
              onChange={(e) => setSstRegNo(e.target.value)}
            />
            <Input
              label="Tourism Tax Registration No. (optional)"
              placeholder="If applicable"
              value={tourismRegNo}
              onChange={(e) => setTourismRegNo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Address</h3>
            <p className="text-xs text-muted-foreground">
              Business address as registered with SSM / LHDN.
            </p>
          </div>

          <Separator className="bg-white/[0.06]" />

          <Input
            label="Address Line 1 *"
            placeholder="Street address"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            required
          />
          <Input
            label="Address Line 2"
            placeholder="Apartment, unit, floor, etc. (optional)"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
          />
          <Input
            label="Address Line 3"
            placeholder="Additional details (optional)"
            value={addressLine3}
            onChange={(e) => setAddressLine3(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="State *"
              options={STATE_OPTIONS}
              value={state}
              onChange={(val) => setState(val)}
            />
            <Input
              label="City *"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="Postal Code *"
              placeholder="e.g. 50000"
              value={postcode}
              onChange={(e) =>
                setPostcode(e.target.value.replace(/\D/g, ""))
              }
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Details */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Notification Details</h3>
            <p className="text-xs text-muted-foreground">
              Contact details for e-invoice notifications from LHDN.
            </p>
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email Address *"
              type="email"
              placeholder="finance@yourbusiness.com"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number *"
              type="tel"
              placeholder="e.g. 03-12345678"
              value={notificationPhone}
              onChange={(e) => setNotificationPhone(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* LHDN API Credentials (optional) */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">
              Activation{" "}
              <span className="text-xs font-normal text-white/40">
                (optional)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              LHDN MyInvois API credentials for automated e-invoice submission.
              Get these from the{" "}
              <a
                href="https://myinvois.hasil.gov.my"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MyInvois Portal
              </a>
              .
            </p>
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Client ID"
              placeholder="Your MyInvois Client ID"
              value={lhdnClientId}
              onChange={(e) => setLhdnClientId(e.target.value)}
            />
            <Input
              label="Client Secret"
              type="password"
              placeholder="Your MyInvois Client Secret"
              value={lhdnClientSecret}
              onChange={(e) => setLhdnClientSecret(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Taxpayer profile saved successfully.
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          className="gap-2"
          disabled={
            saving ||
            !taxpayerName.trim() ||
            !tin.trim() ||
            !msicCode ||
            !idNumber.trim() ||
            !addressLine1.trim() ||
            !city.trim() ||
            !state ||
            !postcode.trim() ||
            !notificationEmail.trim() ||
            !notificationPhone.trim()
          }
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ─── e-Invoice Requests ─────────────────────────────────────────────

function RequestsSection({ tenantId }: { tenantId: any }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submissionId, setSubmissionId] = useState("");

  const requests = useQuery(
    api.eInvoice.listByTenant,
    tenantId
      ? {
          tenantId,
          status:
            statusFilter !== "all"
              ? (statusFilter as "pending" | "submitted" | "rejected")
              : undefined,
        }
      : "skip"
  );

  const markSubmitted = useMutation(api.eInvoice.markSubmitted);
  const markRejected = useMutation(api.eInvoice.markRejected);
  const revertToPending = useMutation(api.eInvoice.revertToPending);

  async function handleMarkSubmitted(requestId: string) {
    try {
      await markSubmitted({
        requestId: requestId as any,
        lhdnSubmissionId: submissionId.trim() || undefined,
      });
      setSelectedReq(null);
      setSubmissionId("");
    } catch (err) {
      console.error("Failed to mark as submitted:", err);
    }
  }

  async function handleRevert(requestId: string) {
    try {
      await revertToPending({ requestId: requestId as any });
      setSelectedReq(null);
    } catch (err) {
      console.error("Failed to revert:", err);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await markRejected({
        requestId: rejectTarget._id,
        reason: rejectReason.trim(),
      });
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  }

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

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">
              {requests?.filter((r) => r.status === "pending").length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Submitted to LHDN</p>
            <p className="text-2xl font-bold text-emerald-400">
              {requests?.filter((r) => r.status === "submitted").length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-400">
              {requests?.filter((r) => r.status === "rejected").length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          label=""
          options={[
            { label: "All Requests", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Submitted", value: "submitted" },
            { label: "Rejected", value: "rejected" },
          ]}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
        />
      </div>

      {/* Requests Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {requests === undefined ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-12 w-full bg-white/[0.06] rounded-lg"
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-6 w-6 text-white/30 mb-2" />
              <p className="text-sm text-white/50">No e-invoice requests</p>
              <p className="text-xs text-white/30 mt-1">
                Requests will appear here when customers submit their details.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Receipt</TableHead>
                  <TableHead className="text-white/50">Buyer</TableHead>
                  <TableHead className="text-white/50">TIN</TableHead>
                  <TableHead className="text-white/50">Date</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-right text-white/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const statusConfig =
                    REQUEST_STATUS_CONFIG[
                      req.status as keyof typeof REQUEST_STATUS_CONFIG
                    ];
                  return (
                    <TableRow
                      key={req._id}
                      className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setSelectedReq(req)}
                    >
                      <TableCell className="font-mono text-sm">
                        {req.receiptNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {req.buyerName}
                          </p>
                          <p className="text-xs text-white/30">
                            {req.buyerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-white/70">
                        {req.buyerTin}
                      </TableCell>
                      <TableCell className="text-sm text-white/70">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusConfig?.className)}
                        >
                          {statusConfig?.label ?? req.status}
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
                            onClick={() => setSelectedReq(req)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                onClick={() => setSelectedReq(req)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                onClick={() => setRejectTarget(req)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
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

      {/* Request Detail Dialog */}
      <Dialog
        open={!!selectedReq}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReq(null);
            setSubmissionId("");
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReq && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  e-Invoice Request
                </DialogTitle>
                <DialogDescription>
                  Receipt #{selectedReq.receiptNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      REQUEST_STATUS_CONFIG[
                        selectedReq.status as keyof typeof REQUEST_STATUS_CONFIG
                      ]?.className
                    )}
                  >
                    {REQUEST_STATUS_CONFIG[
                      selectedReq.status as keyof typeof REQUEST_STATUS_CONFIG
                    ]?.label ?? selectedReq.status}
                  </Badge>
                  <span className="text-sm text-white/50">
                    {formatDate(selectedReq.createdAt)}{" "}
                    {formatTime(selectedReq.createdAt)}
                  </span>
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Buyer Details */}
                <div>
                  <p className="text-xs text-white/40 mb-2 font-medium">
                    Buyer Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-white/30">Name</p>
                      <p className="text-sm font-medium">
                        {selectedReq.buyerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30">TIN</p>
                      <p className="text-sm font-mono">
                        {selectedReq.buyerTin}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30">ID Type</p>
                      <p className="text-sm uppercase">
                        {selectedReq.buyerIdType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30">ID Number</p>
                      <p className="text-sm">{selectedReq.buyerIdValue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30">Email</p>
                      <p className="text-sm">{selectedReq.buyerEmail}</p>
                    </div>
                    {selectedReq.buyerPhone && (
                      <div>
                        <p className="text-xs text-white/30">Phone</p>
                        <p className="text-sm">{selectedReq.buyerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Address */}
                <div>
                  <p className="text-xs text-white/40 mb-1 font-medium">
                    Address
                  </p>
                  <p className="text-sm text-white/70">
                    {selectedReq.buyerAddress.line1}
                    {selectedReq.buyerAddress.line2
                      ? `, ${selectedReq.buyerAddress.line2}`
                      : ""}
                    <br />
                    {selectedReq.buyerAddress.postcode}{" "}
                    {selectedReq.buyerAddress.city},{" "}
                    {selectedReq.buyerAddress.state}
                  </p>
                </div>

                {selectedReq.buyerSstRegNo && (
                  <div>
                    <p className="text-xs text-white/30">SST Reg No.</p>
                    <p className="text-sm">{selectedReq.buyerSstRegNo}</p>
                  </div>
                )}

                {selectedReq.lhdnSubmissionId && (
                  <>
                    <Separator className="bg-white/[0.06]" />
                    <div>
                      <p className="text-xs text-white/30">
                        LHDN Submission ID
                      </p>
                      <p className="text-sm font-mono">
                        {selectedReq.lhdnSubmissionId}
                      </p>
                    </div>
                  </>
                )}

                {selectedReq.rejectionReason && (
                  <>
                    <Separator className="bg-white/[0.06]" />
                    <div>
                      <p className="text-xs text-white/30">Rejection Reason</p>
                      <p className="text-sm text-red-400">
                        {selectedReq.rejectionReason}
                      </p>
                    </div>
                  </>
                )}

                {/* Mark as submitted */}
                {selectedReq.status === "pending" && (
                  <>
                    <Separator className="bg-white/[0.06]" />
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-white/60">
                        After submitting to LHDN MyInvois:
                      </p>
                      <Input
                        label="LHDN Submission ID (optional)"
                        placeholder="Paste submission ID from MyInvois"
                        value={submissionId}
                        onChange={(e) => setSubmissionId(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                {selectedReq.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => {
                        setRejectTarget(selectedReq);
                        setSelectedReq(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="gap-1"
                      onClick={() =>
                        handleMarkSubmitted(selectedReq._id)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Submitted
                    </Button>
                  </>
                )}
                {(selectedReq.status === "submitted" ||
                  selectedReq.status === "rejected") && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-1 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => handleRevert(selectedReq._id)}
                    >
                      <Clock className="h-4 w-4" />
                      Revert to Pending
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedReq(null)}
                    >
                      Close
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject e-Invoice Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the request from{" "}
              {rejectTarget?.buyerName} (Receipt #{rejectTarget?.receiptNumber}).
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Rejection Reason *"
            placeholder="e.g., Invalid TIN, receipt already invoiced"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
