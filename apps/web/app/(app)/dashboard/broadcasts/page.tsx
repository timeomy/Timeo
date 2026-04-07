"use client";

import { useState } from "react";
import {
  useAdminBroadcasts,
  useCreateBroadcast,
  useToggleBroadcast,
  useDeleteBroadcast,
} from "@timeo/api-client";
import type { Broadcast } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Badge,
  cn,
} from "@timeo/ui/web";
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Tag,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";

const BROADCAST_TYPES = [
  { value: "promotion", label: "Promotion", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { value: "announcement", label: "Announcement", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "event", label: "Event", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "new_service", label: "New Service", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
] as const;

type BroadcastType = "promotion" | "announcement" | "event" | "new_service";

function TypeBadge({ type }: { type: string }) {
  const cfg = BROADCAST_TYPES.find((t) => t.value === type) ?? BROADCAST_TYPES[0];
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ─── Create Form ─────────────────────────────────────────────────────────────
function CreateBroadcastForm({
  tenantId,
  onClose,
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const { mutateAsync: createBroadcast, isPending } = useCreateBroadcast(tenantId);
  const [form, setForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    type: "promotion" as BroadcastType,
    isActive: true,
    expiresAt: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createBroadcast({
        title: form.title || undefined,
        content: form.content || undefined,
        imageUrl: form.imageUrl || undefined,
        type: form.type,
        isActive: form.isActive,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create broadcast");
    }
  }

  return (
    <Card className="glass border-white/[0.08]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Megaphone className="h-5 w-5 text-primary" />
          Create Broadcast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2 block">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value as BroadcastType }))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                    form.type === t.value ? t.color : "border-white/[0.08] bg-white/[0.04] text-white/50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Year Fitness Deal 🎉"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Describe your promotion or announcement..."
              rows={3}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Image URL (optional)
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {form.imageUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.08]" style={{ maxHeight: 180 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-full object-cover"
                  style={{ maxHeight: 180 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Expires at */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Expires At (optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Publish immediately</p>
              <p className="text-xs text-white/40">Members will see this right away</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                form.isActive ? "bg-primary" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  form.isActive ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing...</>
              ) : (
                <><Megaphone className="h-4 w-4 mr-2" />Publish</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Broadcast Row ────────────────────────────────────────────────────────────
function BroadcastRow({
  broadcast,
  tenantId,
}: {
  broadcast: Broadcast;
  tenantId: string;
}) {
  const { mutateAsync: toggle, isPending: toggling } = useToggleBroadcast(tenantId);
  const { mutateAsync: remove, isPending: deleting } = useDeleteBroadcast(tenantId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      {/* Image preview */}
      <div className="shrink-0 h-16 w-16 rounded-xl overflow-hidden bg-white/[0.08] flex items-center justify-center">
        {broadcast.imageUrl ? (
          <img src={broadcast.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-white/20" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <TypeBadge type={broadcast.type} />
          {!broadcast.isActive && (
            <span className="rounded-full bg-white/10 border border-white/[0.08] px-2 py-0.5 text-xs text-white/40">
              Inactive
            </span>
          )}
        </div>
        {broadcast.title && (
          <p className="text-sm font-semibold text-white line-clamp-1">{broadcast.title}</p>
        )}
        {broadcast.content && (
          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{broadcast.content}</p>
        )}
        <p className="text-xs text-white/30 mt-1">
          {new Date(broadcast.createdAt).toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => toggle({ id: broadcast.id, isActive: !broadcast.isActive })}
          disabled={toggling}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            broadcast.isActive
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-white/[0.06] text-white/40 hover:bg-white/[0.1]"
          )}
          title={broadcast.isActive ? "Deactivate" : "Activate"}
        >
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : broadcast.isActive ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => remove(broadcast.id)}
              disabled={deleting}
              className="flex h-8 items-center gap-1 rounded-lg bg-red-500/20 px-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex h-8 items-center gap-1 rounded-lg bg-white/[0.06] px-2 text-xs text-white/50 hover:bg-white/[0.1] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BroadcastsPage() {
  const { tenantId } = useTenantId();
  const { data: broadcasts, isLoading } = useAdminBroadcasts(tenantId);
  const [showCreate, setShowCreate] = useState(false);

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/40">No tenant selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Broadcasts</h1>
          <p className="text-sm text-white/50 mt-1">
            Post promotions, events, and announcements to your members
          </p>
        </div>
        <Button
          onClick={() => setShowCreate((v) => !v)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showCreate ? "Cancel" : "New Broadcast"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && tenantId && (
        <CreateBroadcastForm tenantId={tenantId} onClose={() => setShowCreate(false)} />
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/[0.06]" />
          ))
        ) : !broadcasts || broadcasts.length === 0 ? (
          <Card className="glass border-white/[0.08]">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06]">
                <Megaphone className="h-8 w-8 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white/60">No broadcasts yet</p>
                <p className="text-sm text-white/30 mt-1">
                  Create your first broadcast to engage your members
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Broadcast
              </Button>
            </CardContent>
          </Card>
        ) : (
          (broadcasts as Broadcast[]).map((bc) => (
            <BroadcastRow key={bc.id} broadcast={bc} tenantId={tenantId} />
          ))
        )}
      </div>
    </div>
  );
}
