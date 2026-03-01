"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, useUpdatePlatformFlag } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
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
  Input,
} from "@timeo/ui/web";
import { ArrowLeft, Plus, Trash2, Flag } from "lucide-react";

interface FlagDetail {
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string;
  overrides: FlagOverride[];
}

interface FlagOverride {
  tenantId: string;
  tenantName: string;
  enabled: boolean;
  setBy: string;
  setAt: string;
}

export default function FlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flagKey = decodeURIComponent(params.key as string);

  const [addOverrideOpen, setAddOverrideOpen] = useState(false);
  const [overrideTenantId, setOverrideTenantId] = useState("");
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [addError, setAddError] = useState("");
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [removingTenantId, setRemovingTenantId] = useState<string | null>(null);

  const { data: flag, isLoading } = useQuery({
    queryKey: ["platform", "flags", flagKey],
    queryFn: () =>
      api.get<FlagDetail>(`/api/platform/flags/${encodeURIComponent(flagKey)}`),
    enabled: !!flagKey,
  });

  const { mutateAsync: updateFlag } = useUpdatePlatformFlag();

  const { mutateAsync: addOverride, isPending: addingOverride } = useMutation({
    mutationFn: ({
      tenantId,
      enabled,
    }: {
      tenantId: string;
      enabled: boolean;
    }) =>
      api.post(`/api/platform/flags/${encodeURIComponent(flagKey)}/overrides`, {
        tenantId,
        enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["platform", "flags", flagKey],
      });
      setAddOverrideOpen(false);
      setOverrideTenantId("");
      setAddError("");
    },
  });

  const { mutateAsync: removeOverride } = useMutation({
    mutationFn: (tenantId: string) =>
      api.delete(
        `/api/platform/flags/${encodeURIComponent(flagKey)}/overrides/${tenantId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["platform", "flags", flagKey],
      });
      setRemovingTenantId(null);
    },
  });

  const handleGlobalToggle = async () => {
    if (!flag) return;
    setTogglingGlobal(true);
    try {
      await updateFlag({ key: flagKey, enabled: !flag.enabled });
      queryClient.invalidateQueries({ queryKey: ["platform", "flags", flagKey] });
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideTenantId.trim()) {
      setAddError("Tenant ID is required.");
      return;
    }
    setAddError("");
    await addOverride({
      tenantId: overrideTenantId.trim(),
      enabled: overrideEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!flag) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Flag className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-xl font-bold">Flag Not Found</h2>
        <Button variant="outline" onClick={() => router.push("/platform/flags")}>
          Back to Flags
        </Button>
      </div>
    );
  }

  const overrides = flag.overrides ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/platform/flags")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            {flag.key}
          </h1>
          {flag.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {flag.description}
            </p>
          )}
        </div>
      </div>

      {/* Global Toggle */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Global Setting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {flag.enabled ? "Enabled globally" : "Disabled globally"}
              </p>
              <p className="text-xs text-muted-foreground">
                Last modified{" "}
                {new Date(flag.updatedAt).toLocaleDateString("en-MY", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={handleGlobalToggle}
              disabled={togglingGlobal}
              className="flex items-center gap-3"
              aria-label={`Toggle ${flag.key} globally`}
            >
              <div
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  flag.enabled ? "bg-emerald-500" : "bg-white/20"
                } ${togglingGlobal ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    flag.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <Badge
                variant="outline"
                className={
                  flag.enabled
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                }
              >
                {flag.enabled ? "On" : "Off"}
              </Badge>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Tenant Overrides */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Tenant Overrides ({overrides.length})
          </CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setAddOverrideOpen(true);
              setAddError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add Override
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {overrides.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No tenant overrides set. All tenants use the global value.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead className="hidden md:table-cell">Set By</TableHead>
                  <TableHead className="hidden sm:table-cell">Set At</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((ov) => (
                  <TableRow key={ov.tenantId} className="border-white/[0.06]">
                    <TableCell>
                      <p className="font-medium">{ov.tenantName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ov.tenantId}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          ov.enabled
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }
                      >
                        {ov.enabled ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {ov.setBy || "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {new Date(ov.setAt).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setRemovingTenantId(ov.tenantId);
                          removeOverride(ov.tenantId);
                        }}
                        disabled={removingTenantId === ov.tenantId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog
        open={addOverrideOpen}
        onOpenChange={(open) => {
          setAddOverrideOpen(open);
          if (!open) {
            setOverrideTenantId("");
            setAddError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tenant Override</DialogTitle>
            <DialogDescription>
              Set a per-tenant override for{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {flag.key}
              </code>
              . This takes precedence over the global setting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              label="Tenant ID"
              placeholder="Enter tenant ID..."
              value={overrideTenantId}
              onChange={(e) => {
                setOverrideTenantId(e.target.value);
                setAddError("");
              }}
            />
            <div>
              <p className="mb-2 text-sm font-medium">Override Value</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOverrideEnabled(true)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    overrideEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  Enabled
                </button>
                <button
                  onClick={() => setOverrideEnabled(false)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    !overrideEnabled
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOverrideOpen(false)}
              disabled={addingOverride}
            >
              Cancel
            </Button>
            <Button onClick={handleAddOverride} disabled={addingOverride}>
              {addingOverride ? "Adding..." : "Add Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
