"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  ArrowLeft,
  Users,
  AlertTriangle,
  Save,
  ExternalLink,
  Ban,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  country: string;
  currency: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  members: TenantMember[];
}

interface TenantMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  joinedAt: string;
}

interface TenantBilling {
  plan: string;
  status: string;
  amountCents: number;
  startDate: string;
  nextRenewal: string;
  paymentMethod: string;
}

interface TenantAuditEntry {
  id: string;
  action: string;
  actorEmail: string;
  createdAt: string;
  details: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const planOptions = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Pending", value: "pending" },
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

const roleColors: Record<string, string> = {
  platform_admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMrr(cents: number) {
  return `RM ${(cents / 100).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function InfoTab({
  tenant,
  onUpdated,
}: {
  tenant: TenantDetail;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { mutateAsync: updateTenant } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/api/platform/tenants/${tenant.id}`, data),
    onSuccess: onUpdated,
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateTenant({
        ...(name.trim() !== tenant.name && { name: name.trim() }),
        ...(plan !== tenant.plan && { plan }),
        ...(status !== tenant.status && { status }),
      });
      setEditing(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(tenant.name);
    setPlan(tenant.plan);
    setStatus(tenant.status);
    setError("");
    setEditing(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tenant Information</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2">
          {editing ? (
            <>
              <Input
                label="Business Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                disabled={saving}
              />
              <div>
                <p className="mb-1.5 text-sm font-medium">Slug</p>
                <p className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  @{tenant.slug}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Slug cannot be changed after creation.
                </p>
              </div>
              <Select
                label="Plan"
                options={planOptions}
                value={plan}
                onChange={(v) => {
                  setPlan(v);
                  setError("");
                }}
                disabled={saving}
              />
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setError("");
                }}
                disabled={saving}
              />
            </>
          ) : (
            <>
              <DetailRow label="Business Name" value={tenant.name} />
              <DetailRow label="Slug" value={`@${tenant.slug}`} />
              <DetailRow label="Plan" value={tenant.plan} />
              <DetailRow label="Status" value={tenant.status} />
              <DetailRow
                label="Owner"
                value={`${tenant.ownerName} (${tenant.ownerEmail})`}
              />
              <DetailRow label="Country / Currency" value={`${tenant.country} / ${tenant.currency}`} />
              <DetailRow label="Created" value={formatDate(tenant.createdAt)} />
            </>
          )}
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MembersTab({ tenant }: { tenant: TenantDetail }) {
  const members = tenant.members ?? [];
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No members found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className="border-white/[0.06]">
                  <TableCell>
                    <div>
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.userEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleColors[member.role] ?? ""}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[member.status] ?? ""}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BillingTab({ tenantId }: { tenantId: string }) {
  const { data: billing, isLoading } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "billing"],
    queryFn: () =>
      api.get<TenantBilling>(`/api/platform/tenants/${tenantId}/billing`),
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="space-y-3 p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!billing) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No billing information available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Billing &amp; Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2">
          <DetailRow label="Plan" value={billing.plan} />
          <DetailRow label="Status" value={billing.status} />
          <DetailRow label="Amount / Month" value={formatMrr(billing.amountCents)} />
          <DetailRow label="Payment Method" value={billing.paymentMethod || "—"} />
          <DetailRow
            label="Subscription Start"
            value={billing.startDate ? formatDate(billing.startDate) : "—"}
          />
          <DetailRow
            label="Next Renewal"
            value={billing.nextRenewal ? formatDate(billing.nextRenewal) : "—"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AuditTab({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "audit"],
    queryFn: () =>
      api.get<{ items: TenantAuditEntry[] }>(
        `/api/platform/audit-logs?tenantId=${tenantId}&limit=50`,
      ),
  });

  const entries = data?.items ?? [];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No audit entries for this tenant.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="border-white/[0.06]">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("en-MY")}
                  </TableCell>
                  <TableCell className="text-xs">{entry.actorEmail}</TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">
                      {entry.action.replace(/\./g, " › ").replace(/_/g, " ")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantId = params.id as string;

  const [activeTab, setActiveTab] = useState("info");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [impersonating, setImpersonating] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: tenant,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["platform", "tenants", tenantId],
    queryFn: () =>
      api.get<TenantDetail>(`/api/platform/tenants/${tenantId}`),
    enabled: !!tenantId,
  });

  const { mutateAsync: toggleSuspend } = useMutation({
    mutationFn: () =>
      api.post(`/api/platform/tenants/${tenantId}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["platform", "tenants", tenantId],
      });
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
  });

  const { mutateAsync: deleteTenant } = useMutation({
    mutationFn: () => api.delete(`/api/platform/tenants/${tenantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      router.push("/platform/tenants");
    },
  });

  const { mutateAsync: impersonate } = useMutation({
    mutationFn: () =>
      api.post<{ token: string; url: string }>(
        `/api/platform/tenants/${tenantId}/impersonate`,
      ),
  });

  const handleSuspendToggle = async () => {
    setSuspending(true);
    try {
      await toggleSuspend();
    } finally {
      setSuspending(false);
    }
  };

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const result = await impersonate();
      const url = result.url
        ? result.url
        : `/dashboard?impersonate=${result.token}&tenant=${tenant?.slug ?? ""}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setImpersonating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== tenant?.slug) {
      setDeleteError("Slug does not match. Please try again.");
      return;
    }
    setDeleteError("");
    await deleteTenant();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Tenant Not Found</h2>
        <p className="text-muted-foreground">
          This tenant may have been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/platform/tenants")}
        >
          Back to Tenants
        </Button>
      </div>
    );
  }

  const isSuspended = tenant.status === "suspended";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/platform/tenants")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {tenant.name}
              </h1>
              <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={planColors[tenant.plan] ?? ""}
          >
            {tenant.plan}
          </Badge>
          <Badge
            variant="outline"
            className={statusColors[tenant.status] ?? ""}
          >
            {tenant.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImpersonate}
            disabled={impersonating}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {impersonating ? "Generating..." : "Impersonate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuspendToggle}
            disabled={suspending}
            className="gap-1.5"
          >
            <Ban className="h-3.5 w-3.5" />
            {suspending
              ? "..."
              : isSuspended
                ? "Unsuspend"
                : "Suspend"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="members">
            Members ({tenant.members?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <InfoTab tenant={tenant} onUpdated={() => refetch()} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab tenant={tenant} />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteConfirm("");
            setDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant?</DialogTitle>
            <DialogDescription>
              This will soft-delete <strong>{tenant.name}</strong>. All tenant
              data will be retained for 90 days. Type the slug{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {tenant.slug}
              </code>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              placeholder={tenant.slug}
              value={deleteConfirm}
              onChange={(e) => {
                setDeleteConfirm(e.target.value);
                setDeleteError("");
              }}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {deleteError && (
              <p className="mt-2 text-sm text-destructive">{deleteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== tenant.slug}
            >
              Delete Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
