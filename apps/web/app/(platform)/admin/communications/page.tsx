"use client";

import { useState } from "react";
import {
  usePlatformAnnouncements,
  useCreatePlatformAnnouncement,
  useUpdatePlatformAnnouncement,
  useDeletePlatformAnnouncement,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@timeo/ui/web";
import { Megaphone, Plus, Trash2 } from "lucide-react";

const TYPE_VARIANTS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TYPE_OPTIONS = [
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

const TARGET_OPTIONS = [
  { label: "All Users", value: "all" },
  { label: "Admins Only", value: "admins" },
];

export default function CommunicationsPage() {
  const { data: announcements, isLoading } = usePlatformAnnouncements();
  const createAnnouncement = useCreatePlatformAnnouncement();
  const updateAnnouncement = useUpdatePlatformAnnouncement();
  const deleteAnnouncement = useDeletePlatformAnnouncement();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "warning" | "critical">("info");
  const [target, setTarget] = useState<"all" | "admins">("all");

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    await createAnnouncement.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      type,
      target,
      active: true,
    });
    setTitle("");
    setBody("");
    setType("info");
    setTarget("all");
    setShowCreate(false);
  }

  function handleToggleActive(id: string, currentActive: boolean) {
    updateAnnouncement.mutate({ id, active: !currentActive });
  }

  function handleDelete(id: string) {
    deleteAnnouncement.mutate(id);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="mt-1 text-muted-foreground">
            Manage announcements and broadcasts to tenants.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcements
          </CardTitle>
          <CardDescription>
            Broadcast messages shown in tenant dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !announcements || announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No announcements</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create announcements to notify tenants about updates and important information.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-lg border border-white/[0.06] p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{ann.title}</h3>
                        <Badge variant="outline" className={TYPE_VARIANTS[ann.type]}>
                          {ann.type}
                        </Badge>
                        <Badge variant="outline">
                          {ann.target}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            ann.active
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }
                        >
                          {ann.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{ann.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created: {new Date(ann.createdAt).toLocaleDateString()}
                        {ann.expiresAt && (
                          <> &middot; Expires: {new Date(ann.expiresAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(ann.id, ann.active)}
                      >
                        {ann.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(ann.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Announcement Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body</label>
              <Input
                value={body}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBody(e.target.value)}
                placeholder="Announcement body text"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                options={TYPE_OPTIONS}
                value={type}
                onChange={(v: string) => setType(v as "info" | "warning" | "critical")}
              />
              <Select
                label="Target"
                options={TARGET_OPTIONS}
                value={target}
                onChange={(v: string) => setTarget(v as "all" | "admins")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createAnnouncement.isPending || !title.trim() || !body.trim()}
            >
              {createAnnouncement.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
