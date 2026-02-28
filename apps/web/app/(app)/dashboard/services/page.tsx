"use client";

import { useState } from "react";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
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
  Clock,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";

const CURRENCY_OPTIONS = [
  { label: "MYR (RM)", value: "MYR" },
  { label: "USD ($)", value: "USD" },
  { label: "SGD (S$)", value: "SGD" },
];

interface ServiceForm {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  currency: string;
}

const EMPTY_FORM: ServiceForm = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
  currency: "MYR",
};

export default function ServicesPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: services, isLoading } = useServices(tenantId ?? "");

  const { mutateAsync: createService } = useCreateService(tenantId ?? "");
  const { mutateAsync: updateService } = useUpdateService(tenantId ?? "");
  const { mutateAsync: deleteService } = useDeleteService(tenantId ?? "");

  const filtered =
    services?.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(service: NonNullable<typeof services>[number]) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: String(service.durationMinutes),
      price: String(service.price),
      currency: service.currency ?? "MYR",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.durationMinutes || !form.price) return;
    if (!editingId && !tenantId) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        durationMinutes: Number(form.durationMinutes),
        price: Number(form.price),
        currency: form.currency,
      };
      if (editingId) {
        await updateService({ id: editingId, ...data });
      } else {
        await createService(data);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save service:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(serviceId: string) {
    if (!tenantId) return;
    setTogglingId(serviceId);
    try {
      await deleteService(serviceId);
    } catch (err) {
      console.error("Failed to toggle service:", err);
    } finally {
      setTogglingId(null);
    }
  }

  function formatDuration(mins: number) {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Services
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${services?.length ?? 0} service${(services?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search services..."
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
            <EmptyState hasServices={(services?.length ?? 0) > 0} onAdd={openCreate} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Service</TableHead>
                  <TableHead className="text-white/50">Duration</TableHead>
                  <TableHead className="text-white/50">Price</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-right text-white/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((service) => (
                  <TableRow
                    key={service.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{service.name}</p>
                        {service.description && (
                          <p className="mt-0.5 text-xs text-white/40 line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Clock className="h-3.5 w-3.5 text-white/40" />
                        {formatDuration(service.durationMinutes)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatPrice(service.price, service.currency ?? "MYR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={service.isActive ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          service.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-white/[0.06] text-white/40 border-white/[0.08]",
                        )}
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => openEdit(service)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-7 gap-1",
                            service.isActive
                              ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                              : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                          )}
                          disabled={togglingId === service.id}
                          onClick={() => handleToggle(service.id)}
                        >
                          {service.isActive ? (
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
              {editingId ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details for this service."
                : "Create a new service for your business."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Service Name"
              placeholder="e.g., Hair Cut, Massage"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                placeholder="Describe the service..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <Input
              label="Duration (minutes)"
              type="number"
              placeholder="e.g., 30"
              min={1}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: e.target.value })
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
              disabled={saving || !form.name.trim() || !form.durationMinutes || !form.price}
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Service"}
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
  hasServices,
  onAdd,
}: {
  hasServices: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        {hasServices ? (
          <Search className="h-6 w-6 text-white/30" />
        ) : (
          <Wrench className="h-6 w-6 text-white/30" />
        )}
      </div>
      <p className="text-sm font-medium text-white/50">
        {hasServices ? "No services match your search" : "No services yet"}
      </p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">
        {hasServices
          ? "Try adjusting your search query."
          : "Create your first service to start accepting bookings."}
      </p>
      {!hasServices && (
        <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      )}
    </div>
  );
}
