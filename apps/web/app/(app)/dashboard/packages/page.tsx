"use client";

import { useState } from "react";
import {
  useSessionPackages,
  useCreateSessionPackage,
  useUpdateSessionPackage,
  useDeleteSessionPackage,
} from "@timeo/api-client";
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
  Plus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  AlertCircle,
} from "lucide-react";

const CURRENCY_OPTIONS = [
  { label: "MYR (RM)", value: "MYR" },
  { label: "USD ($)", value: "USD" },
  { label: "SGD (S$)", value: "SGD" },
];

interface PackageForm {
  name: string;
  description: string;
  sessionCount: string;
  price: string;
  currency: string;
}

const EMPTY_FORM: PackageForm = {
  name: "",
  description: "",
  sessionCount: "",
  price: "",
  currency: "MYR",
};

export default function PackagesPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: packages, isLoading } = useSessionPackages(tenantId ?? "");

  const { mutateAsync: createPackage } = useCreateSessionPackage(tenantId ?? "");
  const { mutateAsync: updatePackage } = useUpdateSessionPackage(tenantId ?? "");
  const { mutateAsync: deletePackage } = useDeleteSessionPackage(tenantId ?? "");

  const filtered =
    packages?.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(pkg: NonNullable<typeof packages>[number]) {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      sessionCount: String(pkg.sessionCount),
      price: String(pkg.price),
      currency: pkg.currency ?? "MYR",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sessionCount || !form.price) return;
    if (!editingId && !tenantId) return;
    setSaving(true);
    try {
      if (editingId) {
        await updatePackage({
          id: editingId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sessionCount: Number(form.sessionCount),
          price: Number(form.price),
          currency: form.currency,
        });
      } else {
        await createPackage({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sessionCount: Number(form.sessionCount),
          price: Number(form.price),
          currency: form.currency,
        });
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save package:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(packageId: string) {
    if (!tenantId) return;
    setTogglingId(packageId);
    try {
      await deletePackage(packageId);
    } catch (err) {
      console.error("Failed to toggle package:", err);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Packages
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${packages?.length ?? 0} package${(packages?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Package
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search packages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasPackages={(packages?.length ?? 0) > 0}
              onAdd={openCreate}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Package</TableHead>
                  <TableHead className="text-white/50">Sessions</TableHead>
                  <TableHead className="text-white/50">Price</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-right text-white/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pkg) => (
                  <TableRow
                    key={pkg.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{pkg.name}</p>
                        {pkg.description && (
                          <p className="mt-0.5 text-xs text-white/40 line-clamp-1">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-white/70">
                        <CreditCard className="h-3.5 w-3.5 text-white/40" />
                        {pkg.sessionCount} session
                        {pkg.sessionCount !== 1 ? "s" : ""}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatPrice(pkg.price, pkg.currency ?? "MYR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pkg.isActive ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          pkg.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-white/[0.06] text-white/40 border-white/[0.08]",
                        )}
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => openEdit(pkg)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-7 gap-1",
                            pkg.isActive
                              ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                              : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                          )}
                          disabled={togglingId === pkg.id}
                          onClick={() => handleToggle(pkg.id)}
                        >
                          {pkg.isActive ? (
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
                ))}
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
              {editingId ? "Edit Package" : "Add Package"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details for this session package."
                : "Create a new session package for members to purchase."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Package Name"
              placeholder="e.g., 10-Session PT Pack"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                placeholder="Describe the package..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <Input
              label="Number of Sessions"
              type="number"
              placeholder="e.g., 10"
              min={1}
              value={form.sessionCount}
              onChange={(e) =>
                setForm({ ...form, sessionCount: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price"
                type="number"
                placeholder="0.00"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Select
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={form.currency}
                onChange={(value) => setForm({ ...form, currency: value })}
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
              disabled={
                saving ||
                !form.name.trim() ||
                !form.sessionCount ||
                !form.price
              }
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Package"}
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
          <Skeleton className="h-4 w-32 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-7 w-28 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasPackages,
  onAdd,
}: {
  hasPackages: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        {hasPackages ? (
          <Search className="h-6 w-6 text-white/30" />
        ) : (
          <CreditCard className="h-6 w-6 text-white/30" />
        )}
      </div>
      <p className="text-sm font-medium text-white/50">
        {hasPackages ? "No packages match your search" : "No packages yet"}
      </p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">
        {hasPackages
          ? "Try adjusting your search query."
          : "Create your first session package for members to purchase."}
      </p>
      {!hasPackages && (
        <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Package
        </Button>
      )}
    </div>
  );
}
