"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useTenant,
  useUpdateTenantSettings,
  usePlatformFlags,
  useUpdatePlatformFlag,
} from "@timeo/api-client";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Package,
  Save,
  Settings,
  Camera,
  Flag,
  Plus,
} from "lucide-react";

function Toggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-red-500/20 text-red-400 border-red-500/30",
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
  const tenantId = params.id as string;

  const { data: tenant, isLoading } = useTenant(tenantId);
  const updateTenantSettingsMutation = useUpdateTenantSettings(tenantId);
  const { data: featureFlags, isLoading: flagsLoading } = usePlatformFlags();
  const updateFlagMutation = useUpdatePlatformFlag();

  const [editName, setEditName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [timezone, setTimezone] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Feature Flags state
  const [addFlagOpen, setAddFlagOpen] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(true);
  const [savingFlag, setSavingFlag] = useState(false);

  // Initialize settings from tenant
  useEffect(() => {
    if (!tenant) return;
    setTimezone(tenant.timezone ?? "");
  }, [tenant]);

  const loading = isLoading;

  // Derived editable values
  const currentName = editName ?? tenant?.name ?? "";

  const hasChanges = editName !== null && editName !== tenant?.name;

  async function handleSave() {
    if (!tenant || !hasChanges) return;
    setSaving(true);
    try {
      if (editName !== null && editName !== tenant.name) {
        await updateTenantSettingsMutation.mutateAsync({ name: editName });
      }
      setEditName(null);
    } catch (err: any) {
      alert(err.message || "Failed to update tenant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    if (!tenant) return;
    setSavingSettings(true);
    try {
      await updateTenantSettingsMutation.mutateAsync({
        timezone: timezone || undefined,
      });
    } catch (err: any) {
      alert(err.message || "Failed to update settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleToggleFlag(key: string, enabled: boolean) {
    try {
      await updateFlagMutation.mutateAsync({ key, enabled });
    } catch (err: any) {
      alert(err.message || "Failed to toggle feature flag.");
    }
  }

  async function handleAddFlag() {
    if (!newFlagKey.trim()) return;
    setSavingFlag(true);
    try {
      await updateFlagMutation.mutateAsync({
        key: newFlagKey.trim(),
        enabled: newFlagEnabled,
      });
      setNewFlagKey("");
      setNewFlagEnabled(true);
      setAddFlagOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to add feature flag.");
    } finally {
      setSavingFlag(false);
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
                {tenant!.name[0]?.toUpperCase() ?? "?"}
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
                    {tenant!.name}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    @{tenant!.slug}
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
            className={
              tenant!.isActive
                ? STATUS_BADGE_VARIANTS.active
                : STATUS_BADGE_VARIANTS.inactive
            }
          >
            {tenant!.isActive ? "active" : "inactive"}
          </Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatMini
          title="Currency"
          value={tenant?.currency ?? "MYR"}
          icon={Package}
          loading={loading}
        />
        <StatMini
          title="Timezone"
          value={tenant?.timezone ?? "Not set"}
          icon={Calendar}
          loading={loading}
        />
        <StatMini
          title="Status"
          value={tenant?.isActive ? "Active" : "Inactive"}
          icon={Users}
          loading={loading}
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

              <Separator className="bg-white/[0.06]" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Slug
                  </p>
                  <p className="text-sm">@{tenant!.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm">
                    {new Date(tenant!.createdAt).toLocaleDateString("en-US", {
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
                    {tenant!.timezone ?? "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Currency
                  </p>
                  <p className="text-sm">{tenant!.currency}</p>
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
            <CardTitle className="text-lg">Tenant Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {tenant!.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tenant ID: {tenant!.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Settings */}
      {!loading && (
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Tenant Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input
                value={timezone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTimezone(e.target.value)
                }
                placeholder="Asia/Kuala_Lumpur"
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feature Flags */}
      {!loading && (
        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddFlagOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Flag
            </Button>
          </CardHeader>
          <CardContent>
            {flagsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !featureFlags || featureFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No platform flags configured.
              </p>
            ) : (
              <div className="space-y-3">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3"
                  >
                    <span className="text-sm font-medium font-mono">
                      {flag.key}
                    </span>
                    <Toggle
                      checked={flag.enabled}
                      onCheckedChange={(val) =>
                        handleToggleFlag(flag.key, val)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Flag Dialog */}
      <Dialog open={addFlagOpen} onOpenChange={setAddFlagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Flag Key</label>
              <Input
                value={newFlagKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewFlagKey(e.target.value)
                }
                placeholder="e.g. enable_door_access"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enabled</label>
              <Toggle
                checked={newFlagEnabled}
                onCheckedChange={setNewFlagEnabled}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddFlagOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFlag}
              disabled={savingFlag || !newFlagKey.trim()}
            >
              {savingFlag ? "Adding..." : "Add Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
