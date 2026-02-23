"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
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
  Calendar,
  Briefcase,
  Save,
  AlertTriangle,
} from "lucide-react";

const planOptions = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Trial", value: "trial" },
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
  trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const roleColors: Record<string, string> = {
  platform_admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatMini({ icon: Icon, label, value, loading }: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <p className="text-xl font-bold">{value}</p>
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const tenant = useQuery(
    api.platform.getTenantById,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const stats = useQuery(
    api.platform.getTenantStats,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const updateTenant = useMutation(api.platform.updateTenant);

  const [editName, setEditName] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);

  const isEditing = editName !== null || editPlan !== null || editStatus !== null;

  const startEditing = () => {
    if (!tenant) return;
    setEditName(tenant.name);
    setEditPlan(tenant.plan);
    setEditStatus(tenant.status);
    setError("");
  };

  const cancelEditing = () => {
    setEditName(null);
    setEditPlan(null);
    setEditStatus(null);
    setError("");
  };

  const handleSave = async () => {
    if (!tenant || editName === null || editPlan === null || editStatus === null) return;

    if (!editName.trim()) {
      setError("Name is required.");
      return;
    }

    // Confirm if suspending
    if (editStatus === "suspended" && tenant.status !== "suspended") {
      setSuspendOpen(true);
      return;
    }

    await doSave();
  };

  const doSave = async () => {
    if (!tenant || editName === null || editPlan === null || editStatus === null) return;

    setSaving(true);
    setError("");
    setSuspendOpen(false);

    try {
      await updateTenant({
        tenantId: tenantId as any,
        ...(editName.trim() !== tenant.name && { name: editName.trim() }),
        ...(editPlan !== tenant.plan && { plan: editPlan as any }),
        ...(editStatus !== tenant.status && { status: editStatus as any }),
      });
      cancelEditing();
    } catch (err: any) {
      setError(err?.message || "Failed to update tenant.");
    } finally {
      setSaving(false);
    }
  };

  if (tenant === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (tenant === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Tenant Not Found</h2>
        <p className="text-muted-foreground">This tenant may have been deleted.</p>
        <Button variant="outline" onClick={() => router.push("/platform/tenants")}>
          Back to Tenants
        </Button>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
              <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={planColors[tenant.plan] ?? ""}>
            {tenant.plan}
          </Badge>
          <Badge variant="outline" className={statusColors[tenant.status] ?? ""}>
            {tenant.status}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatMini
          icon={Users}
          label="Members"
          value={stats?.membersCount ?? 0}
          loading={stats === undefined}
        />
        <StatMini
          icon={Calendar}
          label="Bookings"
          value={stats?.bookingsCount ?? 0}
          loading={stats === undefined}
        />
        <StatMini
          icon={Briefcase}
          label="Services"
          value={stats?.servicesCount ?? 0}
          loading={stats === undefined}
        />
      </div>

      {/* Details & Edit */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tenant Details</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={handleSave}
                loading={saving}
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            {isEditing ? (
              <>
                <Input
                  label="Name"
                  value={editName ?? ""}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setError("");
                  }}
                  disabled={saving}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Slug
                  </label>
                  <p className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {tenant.slug}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Slug cannot be changed.
                  </p>
                </div>
                <Select
                  label="Plan"
                  options={planOptions}
                  value={editPlan ?? tenant.plan}
                  onChange={(v) => {
                    setEditPlan(v);
                    setError("");
                  }}
                  disabled={saving}
                />
                <Select
                  label="Status"
                  options={statusOptions}
                  value={editStatus ?? tenant.status}
                  onChange={(v) => {
                    setEditStatus(v);
                    setError("");
                  }}
                  disabled={saving}
                />
              </>
            ) : (
              <>
                <DetailRow label="Name" value={tenant.name} />
                <DetailRow label="Slug" value={`@${tenant.slug}`} />
                <DetailRow label="Plan" value={tenant.plan} />
                <DetailRow label="Status" value={tenant.status} />
                <DetailRow label="Owner" value={`${tenant.ownerName} (${tenant.ownerEmail})`} />
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

      {/* Members */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">
            Members ({tenant.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tenant.members.length === 0 ? (
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
                {tenant.members.map((member) => (
                  <TableRow key={member._id} className="border-white/[0.06]">
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[member.role] ?? ""}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          member.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : member.status === "invited"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
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

      {/* Suspend Confirmation Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant?</DialogTitle>
            <DialogDescription>
              Suspending <strong>{tenant.name}</strong> will prevent all users from
              accessing this business. This action can be reversed by setting the
              status back to active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doSave} loading={saving}>
              Suspend Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
