"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Select,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@timeo/ui/web";
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 25;

interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
  mrr: number;
}

interface TenantsResponse {
  items: PlatformTenant[];
  total: number;
  page: number;
  limit: number;
}

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Pending", value: "pending" },
];

const planOptions = [
  { label: "All Plans", value: "all" },
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMrr(cents: number) {
  if (cents === 0) return "—";
  return `RM ${(cents / 100).toLocaleString("en-MY", { minimumFractionDigits: 0 })}`;
}

export default function TenantsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"suspend" | "delete" | null>(
    null,
  );

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(search && { search }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(planFilter !== "all" && { plan: planFilter }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants", "list", page, search, statusFilter, planFilter],
    queryFn: () =>
      api.get<TenantsResponse>(`/api/platform/tenants?${params.toString()}`),
    staleTime: 30_000,
  });

  const tenants = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { mutateAsync: bulkSuspend, isPending: suspending } = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.post(`/api/platform/tenants/${id}/suspend`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
  });

  const { mutateAsync: bulkDelete, isPending: deleting } = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.delete(`/api/platform/tenants/${id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === tenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map((t) => t.id)));
    }
  };

  const allSelected = tenants.length > 0 && selectedIds.size === tenants.length;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handlePlanFilter = (value: string) => {
    setPlanFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="mt-1 text-muted-foreground">
            {isLoading ? "Loading tenants..." : `${total} total tenants`}
          </p>
        </div>
        <Link href="/platform/tenants/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Tenant
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or slug..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusFilter}
              className="sm:w-44"
            />
            <Select
              options={planOptions}
              value={planFilter}
              onChange={handlePlanFilter}
              className="sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <p className="text-sm font-medium">
            {selectedIds.size} tenant{selectedIds.size > 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("suspend")}
            >
              Suspend Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkAction("delete")}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all" || planFilter !== "all"
                  ? "No tenants match your filters."
                  : "No tenants yet."}
              </p>
              {!search && statusFilter === "all" && planFilter === "all" && (
                <Link href="/platform/tenants/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Tenant
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-white/20"
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="hidden md:table-cell">Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">MRR</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="border-white/[0.06]">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tenant.id)}
                        onChange={() => toggleSelect(tenant.id)}
                        className="rounded border-white/20"
                        aria-label={`Select ${tenant.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          @{tenant.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={planColors[tenant.plan] ?? ""}
                      >
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[tenant.status] ?? ""}
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatMrr(tenant.mrr)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/platform/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} tenants)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Suspend Confirm */}
      <Dialog
        open={bulkAction === "suspend"}
        onOpenChange={(open) => !open && setBulkAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {selectedIds.size} Tenant(s)?</DialogTitle>
            <DialogDescription>
              This will suspend all selected tenants and prevent their users
              from accessing the dashboard. You can unsuspend them individually
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkSuspend(Array.from(selectedIds))}
              disabled={suspending}
            >
              {suspending ? "Suspending..." : "Suspend All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm */}
      <Dialog
        open={bulkAction === "delete"}
        onOpenChange={(open) => !open && setBulkAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Tenant(s)?</DialogTitle>
            <DialogDescription>
              This will soft-delete all selected tenants. Their data will be
              retained for 90 days before permanent removal. This action cannot
              be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDelete(Array.from(selectedIds))}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
