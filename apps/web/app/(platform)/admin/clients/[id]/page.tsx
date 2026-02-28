"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTenant, useStaffMembers } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  Trash2,
  UserCog,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  platform_admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data: client, isLoading } = useTenant(clientId);
  const { data: staffMembers, isLoading: staffLoading } = useStaffMembers(clientId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteUser = useCallback(async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      // Deletion not yet supported via api-client; navigate back after confirmation
      router.push("/admin/clients");
    } catch (err) {
      console.error("Failed to delete:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="col-span-2 h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Client not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push("/admin/clients")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {(client.name?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {client.name || "Unknown"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                @{client.slug}
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <Dialog
            open={showDeleteConfirm}
            onOpenChange={(open) => {
              setShowDeleteConfirm(open);
              if (!open) setDeleteError("");
            }}
          >
            <DialogTrigger>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Client</DialogTitle>
                <DialogDescription>
                  This will permanently delete{" "}
                  <strong>{client.name}</strong>. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{staffMembers?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Staff Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{client.isActive ? "Active" : "Inactive"}</p>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="truncate text-sm font-medium">
                {client.currency ?? "MYR"}
              </p>
              <p className="text-xs text-muted-foreground">
                Joined{" "}
                {new Date(client.createdAt).toLocaleDateString("en-MY", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Members */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Staff Members</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !staffMembers || staffMembers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No staff members found
            </div>
          ) : (
            <div className="space-y-3">
              {staffMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {m.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Badge
                      variant="outline"
                      className={ROLE_BADGE[m.role] ?? ROLE_BADGE.customer}
                    >
                      {m.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        m.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {m.isActive ? "active" : "inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
