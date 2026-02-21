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
  Plus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Ticket,
  AlertCircle,
  Percent,
  DollarSign,
  Gift,
  CreditCard,
  Copy,
  Ban,
  RefreshCw,
  ArrowUpCircle,
  Eye,
  Handshake,
  Trash2,
} from "lucide-react";

// ─── Types & Constants ──────────────────────────────────────────────

type TabMode = "vouchers" | "gift-cards";
type VoucherType = "percentage" | "fixed" | "free_session";
type VoucherSource = "internal" | "partner" | "public";

const VOUCHER_TYPE_OPTIONS = [
  { label: "Percentage Discount", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Free Session", value: "free_session" },
];

const SOURCE_OPTIONS = [
  { label: "Internal", value: "internal" },
  { label: "Partner", value: "partner" },
  { label: "Public", value: "public" },
];

const VOUCHER_TYPE_CONFIG: Record<
  VoucherType,
  { label: string; icon: typeof Percent; className: string }
> = {
  percentage: {
    label: "Percentage",
    icon: Percent,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  fixed: {
    label: "Fixed",
    icon: DollarSign,
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  free_session: {
    label: "Free Session",
    icon: Gift,
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
};

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  internal: {
    label: "Internal",
    className: "bg-white/[0.06] text-white/60 border-white/[0.08]",
  },
  partner: {
    label: "Partner",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  public: {
    label: "Public",
    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
};

const GC_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  depleted: {
    label: "Depleted",
    className: "bg-white/[0.06] text-white/40 border-white/[0.08]",
  },
  expired: {
    label: "Expired",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

const GC_AMOUNTS = [
  { label: "RM 25", value: 2500 },
  { label: "RM 50", value: 5000 },
  { label: "RM 100", value: 10000 },
  { label: "RM 200", value: 20000 },
  { label: "RM 500", value: 50000 },
  { label: "Custom", value: 0 },
];

// ─── Page ───────────────────────────────────────────────────────────

export default function VouchersPage() {
  const [tab, setTab] = useState<TabMode>("vouchers");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gift Cards & Vouchers
          </h1>
          <p className="text-sm text-white/50">
            Manage gift cards, discount vouchers, and partner promotions.
          </p>
        </div>
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            onClick={() => setTab("vouchers")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "vouchers"
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:text-white"
            )}
          >
            Vouchers
          </button>
          <button
            onClick={() => setTab("gift-cards")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "gift-cards"
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:text-white"
            )}
          >
            Gift Cards
          </button>
        </div>
      </div>

      {tab === "vouchers" ? <VouchersSection /> : <GiftCardsSection />}
    </div>
  );
}

// ─── Vouchers Section ───────────────────────────────────────────────

interface VoucherForm {
  code: string;
  type: VoucherType;
  value: string;
  maxUses: string;
  expiresAt: string;
  source: VoucherSource;
  partnerName: string;
  description: string;
}

const EMPTY_VOUCHER_FORM: VoucherForm = {
  code: "",
  type: "percentage",
  value: "",
  maxUses: "",
  expiresAt: "",
  source: "internal",
  partnerName: "",
  description: "",
};

function VouchersSection() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<GenericId<"vouchers"> | null>(null);
  const [form, setForm] = useState<VoucherForm>(EMPTY_VOUCHER_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<GenericId<"vouchers"> | null>(null);

  const vouchers = useQuery(
    api.vouchers.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const createVoucher = useMutation(api.vouchers.create);
  const updateVoucher = useMutation(api.vouchers.update);
  const toggleActive = useMutation(api.vouchers.toggleActive);

  const filtered =
    vouchers?.filter(
      (v) =>
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        (v.partnerName ?? "").toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_VOUCHER_FORM);
    setDialogOpen(true);
  }

  function openEdit(voucher: NonNullable<typeof vouchers>[number]) {
    setEditingId(voucher._id);
    setForm({
      code: voucher.code,
      type: voucher.type as VoucherType,
      value: String(voucher.value),
      maxUses: voucher.maxUses ? String(voucher.maxUses) : "",
      expiresAt: voucher.expiresAt
        ? new Date(voucher.expiresAt).toISOString().split("T")[0]
        : "",
      source: (voucher.source as VoucherSource) ?? "internal",
      partnerName: voucher.partnerName ?? "",
      description: voucher.description ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.value) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateVoucher({
          voucherId: editingId,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).getTime()
            : undefined,
          source: form.source,
          partnerName: form.partnerName.trim() || undefined,
          description: form.description.trim() || undefined,
        });
      } else {
        if (!tenantId) return;
        await createVoucher({
          tenantId,
          code: form.code.trim(),
          type: form.type,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).getTime()
            : undefined,
          source: form.source,
          partnerName: form.partnerName.trim() || undefined,
          description: form.description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      setForm(EMPTY_VOUCHER_FORM);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save voucher:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(voucherId: GenericId<"vouchers">) {
    setTogglingId(voucherId);
    try {
      await toggleActive({ voucherId });
    } catch (err) {
      console.error("Failed to toggle voucher:", err);
    } finally {
      setTogglingId(null);
    }
  }

  function formatValue(type: VoucherType, value: number) {
    if (type === "percentage") return `${value}%`;
    if (type === "fixed") return `RM ${(value / 100).toFixed(2)}`;
    return "Free";
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const partnerCount = vouchers?.filter((v) => v.source === "partner").length ?? 0;

  return (
    <>
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Total Vouchers</p>
            <p className="text-2xl font-bold text-white">
              {vouchers?.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Active</p>
            <p className="text-2xl font-bold text-emerald-400">
              {vouchers?.filter((v) => v.isActive).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Partner</p>
            <p className="text-2xl font-bold text-orange-400">
              {partnerCount}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Total Redemptions</p>
            <p className="text-2xl font-bold text-blue-400">
              {vouchers?.reduce((sum, v) => sum + v.usedCount, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search codes or partner names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="gap-2 shrink-0" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Voucher
        </Button>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {vouchers === undefined ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={search ? Search : Ticket}
              title={search ? "No vouchers match your search" : "No vouchers yet"}
              description={
                search
                  ? "Try adjusting your search query."
                  : "Create your first voucher to offer discounts."
              }
              action={!search ? openCreate : undefined}
              actionLabel="Create Voucher"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Code</TableHead>
                  <TableHead className="text-white/50">Type</TableHead>
                  <TableHead className="text-white/50">Value</TableHead>
                  <TableHead className="text-white/50">Source</TableHead>
                  <TableHead className="text-white/50">Usage</TableHead>
                  <TableHead className="text-white/50">Expires</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-right text-white/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((voucher) => {
                  const typeConfig =
                    VOUCHER_TYPE_CONFIG[voucher.type as VoucherType];
                  const TypeIcon = typeConfig?.icon ?? Ticket;
                  const source = voucher.source ?? "internal";
                  const sourceConfig = SOURCE_CONFIG[source];
                  return (
                    <TableRow
                      key={voucher._id}
                      className="border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm font-medium text-white">
                            {voucher.code}
                          </span>
                          {voucher.partnerName && (
                            <p className="text-xs text-orange-400/70 flex items-center gap-1 mt-0.5">
                              <Handshake className="h-3 w-3" />
                              {voucher.partnerName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-xs", typeConfig?.className)}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig?.label ?? voucher.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {formatValue(voucher.type as VoucherType, voucher.value)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", sourceConfig?.className)}
                        >
                          {sourceConfig?.label ?? source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {voucher.usedCount}
                        {voucher.maxUses ? ` / ${voucher.maxUses}` : ""}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {voucher.expiresAt
                          ? formatDate(voucher.expiresAt)
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={voucher.isActive ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            voucher.isActive
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-white/[0.06] text-white/40 border-white/[0.08]"
                          )}
                        >
                          {voucher.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => openEdit(voucher)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-7 gap-1",
                              voucher.isActive
                                ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                                : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            )}
                            disabled={togglingId === voucher._id}
                            onClick={() => handleToggle(voucher._id)}
                          >
                            {voucher.isActive ? (
                              <ToggleRight className="h-3.5 w-3.5" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            )}
                          </Button>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Voucher" : "Create Voucher"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the voucher details."
                : "Create a discount voucher or partner promotion."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Voucher Code"
              placeholder="e.g., WELCOME20, PARTNER-FIT50"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              disabled={!!editingId}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Discount Type"
                options={VOUCHER_TYPE_OPTIONS}
                value={form.type}
                onChange={(value) =>
                  setForm({ ...form, type: value as VoucherType })
                }
                disabled={!!editingId}
              />
              <Select
                label="Source"
                options={SOURCE_OPTIONS}
                value={form.source}
                onChange={(value) =>
                  setForm({ ...form, source: value as VoucherSource })
                }
              />
            </div>

            {form.source === "partner" && (
              <Input
                label="Partner Business Name"
                placeholder="e.g., Popular Bookstore"
                value={form.partnerName}
                onChange={(e) =>
                  setForm({ ...form, partnerName: e.target.value })
                }
              />
            )}

            <Input
              label="Description (optional)"
              placeholder="e.g., 20% off first visit, collab with XYZ Gym"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <Input
              label={
                form.type === "percentage"
                  ? "Discount (%)"
                  : form.type === "fixed"
                    ? "Discount Amount (cents)"
                    : "Value"
              }
              type="number"
              placeholder={
                form.type === "percentage" ? "e.g., 20" : "e.g., 5000"
              }
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Max Uses (optional)"
                type="number"
                placeholder="Unlimited"
                min={1}
                value={form.maxUses}
                onChange={(e) =>
                  setForm({ ...form, maxUses: e.target.value })
                }
              />
              <Input
                label="Expiry Date (optional)"
                type="date"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.code.trim() || !form.value}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Gift Cards Section ─────────────────────────────────────────────

function GiftCardsSection() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [topupTarget, setTopupTarget] = useState<any | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  // Create form
  const [selectedAmount, setSelectedAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const giftCards = useQuery(
    api.giftCards.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const createGiftCard = useMutation(api.giftCards.create);
  const topupGiftCard = useMutation(api.giftCards.topup);
  const cancelGiftCard = useMutation(api.giftCards.cancel);
  const reactivateGiftCard = useMutation(api.giftCards.reactivate);
  const removeGiftCard = useMutation(api.giftCards.remove);

  const filtered =
    giftCards?.filter(
      (gc) =>
        gc.code.toLowerCase().includes(search.toLowerCase()) ||
        (gc.recipientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (gc.recipientEmail ?? "").toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  const totalActive = giftCards?.filter((gc) => gc.status === "active").length ?? 0;
  const totalBalance =
    giftCards
      ?.filter((gc) => gc.status === "active")
      .reduce((sum, gc) => sum + gc.currentBalance, 0) ?? 0;
  const totalSold =
    giftCards?.reduce((sum, gc) => sum + gc.initialBalance, 0) ?? 0;

  async function handleCreate() {
    if (!tenantId) return;
    const amount = selectedAmount === 0 ? Number(customAmount) * 100 : selectedAmount;
    if (!amount || amount <= 0) return;

    setCreating(true);
    try {
      await createGiftCard({
        tenantId,
        initialBalance: amount,
        purchaserName: purchaserName.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        message: giftMessage.trim() || undefined,
      });
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      console.error("Failed to create gift card:", err);
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setSelectedAmount(5000);
    setCustomAmount("");
    setRecipientName("");
    setRecipientEmail("");
    setPurchaserName("");
    setGiftMessage("");
  }

  async function handleTopup() {
    if (!topupTarget || !topupAmount) return;
    try {
      await topupGiftCard({
        giftCardId: topupTarget._id,
        amount: Number(topupAmount) * 100,
      });
      setTopupTarget(null);
      setTopupAmount("");
    } catch (err) {
      console.error("Failed to top up:", err);
    }
  }

  async function handleCancel(cardId: string) {
    try {
      await cancelGiftCard({ giftCardId: cardId as any });
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  }

  async function handleReactivate(cardId: string) {
    try {
      await reactivateGiftCard({ giftCardId: cardId as any });
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to reactivate:", err);
    }
  }

  async function handleDelete(cardId: string) {
    if (!confirm("Are you sure you want to permanently delete this gift card? This cannot be undone.")) return;
    try {
      await removeGiftCard({ giftCardId: cardId as any });
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <>
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Total Sold</p>
            <p className="text-2xl font-bold text-white">
              {giftCards?.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Active</p>
            <p className="text-2xl font-bold text-emerald-400">
              {totalActive}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-yellow-400">
              {formatPrice(totalBalance, "MYR")}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Total Sold Value</p>
            <p className="text-2xl font-bold text-blue-400">
              {formatPrice(totalSold, "MYR")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search codes, recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          className="gap-2 shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Issue Gift Card
        </Button>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {giftCards === undefined ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={search ? Search : CreditCard}
              title={
                search
                  ? "No gift cards match your search"
                  : "No gift cards yet"
              }
              description={
                search
                  ? "Try adjusting your search query."
                  : "Issue your first gift card to get started."
              }
              action={!search ? () => setCreateOpen(true) : undefined}
              actionLabel="Issue Gift Card"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Code</TableHead>
                  <TableHead className="text-white/50">Recipient</TableHead>
                  <TableHead className="text-white/50">Balance</TableHead>
                  <TableHead className="text-white/50">Initial</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Created</TableHead>
                  <TableHead className="text-right text-white/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((gc) => {
                  const statusConfig = GC_STATUS_CONFIG[gc.status];
                  const usedPercent =
                    gc.initialBalance > 0
                      ? Math.round(
                          ((gc.initialBalance - gc.currentBalance) /
                            gc.initialBalance) *
                            100
                        )
                      : 0;

                  return (
                    <TableRow
                      key={gc._id}
                      className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setSelectedCard(gc)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-white">
                          {gc.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-white">
                            {gc.recipientName || "—"}
                          </p>
                          {gc.recipientEmail && (
                            <p className="text-xs text-white/30">
                              {gc.recipientEmail}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {formatPrice(gc.currentBalance, gc.currency)}
                          </p>
                          {usedPercent > 0 && (
                            <div className="mt-1 h-1 w-16 rounded-full bg-white/[0.06]">
                              <div
                                className="h-1 rounded-full bg-primary"
                                style={{ width: `${usedPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/60">
                        {formatPrice(gc.initialBalance, gc.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusConfig?.className)}
                        >
                          {statusConfig?.label ?? gc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/60">
                        {formatDate(gc.createdAt)}
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
                            onClick={() => setSelectedCard(gc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {gc.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              onClick={() => setTopupTarget(gc)}
                            >
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
                            onClick={() =>
                              navigator.clipboard.writeText(gc.code)
                            }
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Create Gift Card Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Issue Gift Card
            </DialogTitle>
            <DialogDescription>
              Create a new gift card with a pre-loaded balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount Selection */}
            <div>
              <p className="text-sm font-medium mb-2">Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {GC_AMOUNTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedAmount(opt.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      selectedAmount === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.06]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectedAmount === 0 && (
                <Input
                  label="Custom Amount (RM)"
                  type="number"
                  placeholder="e.g., 150"
                  min={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="mt-3"
                />
              )}
            </div>

            <Separator className="bg-white/[0.06]" />

            <Input
              label="Purchased By (optional)"
              placeholder="Buyer's name"
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Recipient Name (optional)"
                placeholder="Gift recipient"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
              <Input
                label="Recipient Email (optional)"
                type="email"
                placeholder="recipient@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            <Input
              label="Gift Message (optional)"
              placeholder="e.g., Happy Birthday! Enjoy your sessions."
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                (selectedAmount === 0 && (!customAmount || Number(customAmount) <= 0))
              }
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {creating
                ? "Creating..."
                : `Issue ${formatPrice(selectedAmount === 0 ? Number(customAmount || 0) * 100 : selectedAmount, "MYR")} Gift Card`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift Card Detail Dialog */}
      <Dialog
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gift Card Details
                </DialogTitle>
                <DialogDescription>
                  {selectedCard.code}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Balance Card */}
                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center">
                  <p className="text-xs text-white/50 mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-white">
                    {formatPrice(
                      selectedCard.currentBalance,
                      selectedCard.currency
                    )}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    of{" "}
                    {formatPrice(
                      selectedCard.initialBalance,
                      selectedCard.currency
                    )}{" "}
                    initial
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{
                        width: `${selectedCard.initialBalance > 0 ? Math.round((selectedCard.currentBalance / selectedCard.initialBalance) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      GC_STATUS_CONFIG[selectedCard.status]?.className
                    )}
                  >
                    {GC_STATUS_CONFIG[selectedCard.status]?.label ??
                      selectedCard.status}
                  </Badge>
                  <span className="text-sm text-white/50">
                    {formatDate(selectedCard.createdAt)}
                  </span>
                </div>

                <Separator className="bg-white/[0.06]" />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedCard.purchaserName && (
                    <div>
                      <p className="text-xs text-white/30">Purchased By</p>
                      <p>{selectedCard.purchaserName}</p>
                    </div>
                  )}
                  {selectedCard.recipientName && (
                    <div>
                      <p className="text-xs text-white/30">Recipient</p>
                      <p>{selectedCard.recipientName}</p>
                    </div>
                  )}
                  {selectedCard.recipientEmail && (
                    <div>
                      <p className="text-xs text-white/30">Recipient Email</p>
                      <p className="text-white/70">
                        {selectedCard.recipientEmail}
                      </p>
                    </div>
                  )}
                  {selectedCard.expiresAt && (
                    <div>
                      <p className="text-xs text-white/30">Expires</p>
                      <p>{formatDate(selectedCard.expiresAt)}</p>
                    </div>
                  )}
                </div>

                {selectedCard.message && (
                  <>
                    <Separator className="bg-white/[0.06]" />
                    <div>
                      <p className="text-xs text-white/30 mb-1">
                        Gift Message
                      </p>
                      <p className="text-sm text-white/70 italic">
                        &ldquo;{selectedCard.message}&rdquo;
                      </p>
                    </div>
                  </>
                )}

                {/* Code for copying */}
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-white/80">
                    {selectedCard.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      navigator.clipboard.writeText(selectedCard.code)
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => handleDelete(selectedCard._id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                {selectedCard.status === "active" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-1 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => handleCancel(selectedCard._id)}
                    >
                      <Ban className="h-4 w-4" />
                      Cancel Card
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setTopupTarget(selectedCard);
                        setSelectedCard(null);
                      }}
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Top Up
                    </Button>
                  </>
                )}
                {selectedCard.status === "cancelled" &&
                  selectedCard.currentBalance > 0 && (
                    <Button
                      variant="outline"
                      className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => handleReactivate(selectedCard._id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reactivate
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedCard(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Top Up Dialog */}
      <Dialog
        open={!!topupTarget}
        onOpenChange={(open) => {
          if (!open) {
            setTopupTarget(null);
            setTopupAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Gift Card</DialogTitle>
            <DialogDescription>
              Add balance to gift card {topupTarget?.code}. Current balance:{" "}
              {topupTarget
                ? formatPrice(topupTarget.currentBalance, topupTarget.currency)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Top Up Amount (RM)"
            type="number"
            placeholder="e.g., 50"
            min={1}
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTopupTarget(null);
                setTopupAmount("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopup}
              disabled={!topupAmount || Number(topupAmount) <= 0}
            >
              Top Up {topupAmount ? formatPrice(Number(topupAmount) * 100, "MYR") : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Shared Components ──────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-5 w-20 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-7 w-28 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: typeof Ticket;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <Icon className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">{title}</p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">{description}</p>
      {action && actionLabel && (
        <Button size="sm" className="mt-4 gap-2" onClick={action}>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
