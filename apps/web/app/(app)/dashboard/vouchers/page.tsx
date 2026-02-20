"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
import { useTenantId } from "@/hooks/use-tenant-id";
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
} from "lucide-react";

type VoucherType = "percentage" | "fixed" | "free_session";

const VOUCHER_TYPE_OPTIONS = [
  { label: "Percentage Discount", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Free Session", value: "free_session" },
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

interface VoucherForm {
  code: string;
  type: VoucherType;
  value: string;
  maxUses: string;
  expiresAt: string;
}

const EMPTY_FORM: VoucherForm = {
  code: "",
  type: "percentage",
  value: "",
  maxUses: "",
  expiresAt: "",
};

export default function VouchersPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<GenericId<"vouchers"> | null>(
    null,
  );
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<GenericId<"vouchers"> | null>(
    null,
  );

  const vouchers = useQuery(
    api.vouchers.listByTenant,
    tenantId ? { tenantId } : "skip",
  );

  const createVoucher = useMutation(api.vouchers.create);
  const updateVoucher = useMutation(api.vouchers.update);
  const toggleActive = useMutation(api.vouchers.toggleActive);

  const filtered =
    vouchers?.filter((v) =>
      v.code.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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
        });
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Vouchers
          </h1>
          <p className="text-sm text-white/50">
            {vouchers === undefined
              ? "Loading..."
              : `${vouchers.length} voucher${vouchers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Voucher
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search voucher codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {vouchers === undefined ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasVouchers={(vouchers?.length ?? 0) > 0}
              onAdd={openCreate}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Code</TableHead>
                  <TableHead className="text-white/50">Type</TableHead>
                  <TableHead className="text-white/50">Value</TableHead>
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
                  return (
                    <TableRow
                      key={voucher._id}
                      className="border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-white">
                          {voucher.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-xs",
                            typeConfig?.className,
                          )}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig?.label ?? voucher.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {formatValue(
                          voucher.type as VoucherType,
                          voucher.value,
                        )}
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
                              : "bg-white/[0.06] text-white/40 border-white/[0.08]",
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
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-7 gap-1",
                              voucher.isActive
                                ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                                : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                            )}
                            disabled={togglingId === voucher._id}
                            onClick={() => handleToggle(voucher._id)}
                          >
                            {voucher.isActive ? (
                              <>
                                <ToggleRight className="h-3.5 w-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-3.5 w-3.5" />
                                Activate
                              </>
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Voucher" : "Create Voucher"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the voucher details."
                : "Create a new discount voucher code."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Voucher Code"
              placeholder="e.g., WELCOME20"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              disabled={!!editingId}
            />
            <Select
              label="Discount Type"
              options={VOUCHER_TYPE_OPTIONS}
              value={form.type}
              onChange={(value) =>
                setForm({ ...form, type: value as VoucherType })
              }
              disabled={!!editingId}
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
              placeholder={form.type === "percentage" ? "e.g., 20" : "e.g., 5000"}
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <Input
              label="Max Uses (optional)"
              type="number"
              placeholder="Unlimited"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
            <Input
              label="Expiry Date (optional)"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
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
    </div>
  );
}

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
  hasVouchers,
  onAdd,
}: {
  hasVouchers: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        {hasVouchers ? (
          <Search className="h-6 w-6 text-white/30" />
        ) : (
          <Ticket className="h-6 w-6 text-white/30" />
        )}
      </div>
      <p className="text-sm font-medium text-white/50">
        {hasVouchers ? "No vouchers match your search" : "No vouchers yet"}
      </p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">
        {hasVouchers
          ? "Try adjusting your search query."
          : "Create your first voucher to offer discounts to members."}
      </p>
      {!hasVouchers && (
        <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Create Voucher
        </Button>
      )}
    </div>
  );
}
