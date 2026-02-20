"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Select,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Package,
  Save,
} from "lucide-react";

const PLAN_OPTIONS = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Trial", value: "trial" },
];

const PLAN_BADGE_VARIANTS: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  trial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

function StatMini({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="mt-0.5 h-5 w-12" />
        ) : (
          <p className="text-lg font-bold">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as GenericId<"tenants">;

  const tenant = useQuery(api.tenants.getById, { tenantId });
  const updateTenant = useMutation(api.tenants.update);

  // Platform-level stats (no tenant membership required)
  const stats = useQuery(
    api.platform.getTenantStats,
    tenant ? { tenantId } : "skip"
  );

  const [editName, setEditName] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loading = tenant === undefined;
  const statsLoading = stats === undefined;

  // Derived editable values
  const currentName = editName ?? tenant?.name ?? "";
  const currentPlan = editPlan ?? tenant?.plan ?? "free";
  const currentStatus = editStatus ?? tenant?.status ?? "active";

  const hasChanges =
    (editName !== null && editName !== tenant?.name) ||
    (editPlan !== null && editPlan !== tenant?.plan) ||
    (editStatus !== null && editStatus !== tenant?.status);

  async function handleSave() {
    if (!tenant || !hasChanges) return;
    setSaving(true);
    try {
      const updates: {
        tenantId: GenericId<"tenants">;
        name?: string;
        plan?: "free" | "starter" | "pro" | "enterprise";
        status?: "active" | "suspended" | "trial";
      } = { tenantId };

      if (editName !== null && editName !== tenant.name) {
        updates.name = editName;
      }
      if (editPlan !== null && editPlan !== tenant.plan) {
        updates.plan = editPlan as "free" | "starter" | "pro" | "enterprise";
      }
      if (editStatus !== null && editStatus !== tenant.status) {
        updates.status = editStatus as "active" | "suspended" | "trial";
      }

      await updateTenant(updates);

      // Reset edit states
      setEditName(null);
      setEditPlan(null);
      setEditStatus(null);
    } catch (err: any) {
      alert(err.message || "Failed to update tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push("/admin/tenants")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {loading ? (
              <Skeleton className="h-12 w-12 rounded-xl" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {tenant.name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {tenant.name}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    @{tenant.slug}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Badges */}
      {!loading && (
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={PLAN_BADGE_VARIANTS[tenant.plan] ?? PLAN_BADGE_VARIANTS.free}
          >
            {tenant.plan} plan
          </Badge>
          <Badge
            variant="outline"
            className={STATUS_BADGE_VARIANTS[tenant.status] ?? STATUS_BADGE_VARIANTS.active}
          >
            {tenant.status}
          </Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatMini
          title="Members"
          value={stats?.membersCount ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatMini
          title="Bookings"
          value={stats?.bookingsCount ?? 0}
          icon={Calendar}
          loading={statsLoading}
        />
        <StatMini
          title="Services"
          value={stats?.servicesCount ?? 0}
          icon={Package}
          loading={statsLoading}
        />
      </div>

      {/* Editable Fields */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Tenant Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input
                  value={currentName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditName(e.target.value)
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Plan"
                  options={PLAN_OPTIONS}
                  value={currentPlan}
                  onChange={(value: string) => setEditPlan(value)}
                />
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={currentStatus}
                  onChange={(value: string) => setEditStatus(value)}
                />
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Slug
                  </p>
                  <p className="text-sm">@{tenant.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm">
                    {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Timezone
                  </p>
                  <p className="text-sm">
                    {tenant.settings?.timezone ?? "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Auto-confirm Bookings
                  </p>
                  <p className="text-sm">
                    {tenant.settings?.autoConfirmBookings ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Owner Info */}
      {!loading && (
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-lg">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Owner ID: {String(tenant.ownerId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tenant ID: {String(tenant._id)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
