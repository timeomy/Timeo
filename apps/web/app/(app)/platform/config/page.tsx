"use client";

import { useState } from "react";
import { usePlatformConfig, useUpdatePlatformConfig } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Input,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
} from "@timeo/ui/web";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";

export default function PlatformConfigPage() {
  const { data: configData, isLoading } = usePlatformConfig();
  const { mutateAsync: updateConfig } = useUpdatePlatformConfig();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add form state
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Derive a stable key-value list from the config object for rendering
  const configs = configData
    ? Object.entries(configData).map(([key, value]) => ({ key, value, updatedAt: null as null }))
    : [];

  const handleAdd = async () => {
    if (!newKey.trim()) {
      setError("Key is required.");
      return;
    }
    if (!newValue.trim()) {
      setError("Value is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let parsedValue: any = newValue.trim();
      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Keep as string
      }

      await updateConfig({ [newKey.trim()]: parsedValue } as any);
      setAddOpen(false);
      setNewKey("");
      setNewValue("");
    } catch (err: any) {
      setError(err?.message || "Failed to save config.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (key: string) => {
    if (!editValue.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      let parsedValue: any = editValue.trim();
      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Keep as string
      }

      await updateConfig({ [key]: parsedValue } as any);
      setEditingKey(null);
      setEditValue("");
    } catch (err: any) {
      setError(err?.message || "Failed to update config.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (key: string) => {
    setSubmitting(true);
    try {
      await updateConfig({ [key]: undefined } as any);
      setDeleteOpen(null);
    } catch (err: any) {
      setError(err?.message || "Failed to delete config.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (key: string, value: any) => {
    setEditingKey(key);
    setEditValue(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Config</h1>
          <p className="mt-1 text-muted-foreground">
            Global key-value configuration for the platform.
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setAddOpen(true); setError(""); }}>
          <Plus className="h-4 w-4" />
          Add Config
        </Button>
      </div>

      {/* Config Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No configuration keys yet.</p>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => { setAddOpen(true); setError(""); }}
              >
                <Plus className="h-4 w-4" />
                Add First Config
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="hidden sm:table-cell">Updated</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.key} className="border-white/[0.06]">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {config.key}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingKey === config.key ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="flex h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(config.key);
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditSave(config.key)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(config.key, config.value)}
                          className="max-w-[300px] truncate rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-white/[0.06]"
                          title="Click to edit"
                        >
                          {typeof config.value === "string"
                            ? config.value
                            : JSON.stringify(config.value)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {config.updatedAt
                        ? new Date(config.updatedAt).toLocaleDateString("en-MY", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteOpen(config.key)}
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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Add Config Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Configuration</DialogTitle>
            <DialogDescription>
              Add a new key-value pair to the platform config. Values will be
              auto-parsed as JSON if valid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              label="Key"
              placeholder="e.g. maintenance_mode"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setError("");
              }}
              disabled={submitting}
            />
            <Input
              label="Value"
              placeholder='e.g. true or "hello" or {"nested": true}'
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setError("");
              }}
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen !== null} onOpenChange={() => setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Config Key?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteOpen}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOpen && handleDelete(deleteOpen)}
              loading={submitting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
