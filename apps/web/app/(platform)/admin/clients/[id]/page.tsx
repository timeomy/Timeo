"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
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

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  invited: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as GenericId<"users">;

  const client = useQuery(api.platform.getUserById, { userId });
  const updateRole = useMutation(api.platform.updateUserRole);
  const updateStatus = useMutation(api.platform.updateMembershipStatus);
  const deleteUserMutation = useMutation(api.platform.deleteUser);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [updatingMembership, setUpdatingMembership] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState("");

  const handleUpdateRole = useCallback(
    async (tenantId: GenericId<"tenants">, role: string) => {
      setUpdatingMembership(tenantId);
      setMutationError("");
      try {
        await updateRole({
          userId,
          tenantId,
          role: role as "admin" | "staff" | "customer",
        });
      } catch (err) {
        console.error("Failed to update role:", err);
        setMutationError(err instanceof Error ? err.message : "Failed to update role");
      } finally {
        setUpdatingMembership(null);
      }
    },
    [userId, updateRole]
  );

  const handleUpdateStatus = useCallback(
    async (tenantId: GenericId<"tenants">, status: string) => {
      setUpdatingMembership(tenantId);
      setMutationError("");
      try {
        await updateStatus({
          userId,
          tenantId,
          status: status as "active" | "invited" | "suspended",
        });
      } catch (err) {
        console.error("Failed to update status:", err);
        setMutationError(err instanceof Error ? err.message : "Failed to update status");
      } finally {
        setUpdatingMembership(null);
      }
    },
    [userId, updateStatus]
  );

  const handleDeleteUser = useCallback(async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteUserMutation({ userId });
      router.push("/admin/clients");
    } catch (err) {
      console.error("Failed to delete user:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
      setDeleting(false);
    }
  }, [userId, deleteUserMutation, router]);

  if (client === undefined) {
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

  if (client === null) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        User not found.
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
              {(client.name?.[0] ?? client.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {client.name || "Unknown"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {client.email ?? "No email"}
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
                Delete User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  This will permanently delete{" "}
                  <strong>{client.name || client.email}</strong> and remove
                  them from all {client.memberships.length} business
                  {client.memberships.length !== 1 ? "es" : ""}. This cannot
                  be undone.
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
                  {deleting ? "Deleting..." : "Delete User"}
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
              <p className="text-2xl font-bold">{client.memberships.length}</p>
              <p className="text-xs text-muted-foreground">Memberships</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{client.recentBookingCount}</p>
              <p className="text-xs text-muted-foreground">Recent Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="truncate text-sm font-medium">
                {client.email ?? "—"}
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

      {/* Memberships — with inline management controls */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Memberships</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {mutationError && (
            <p className="mb-3 text-sm text-destructive">{mutationError}</p>
          )}
          {client.memberships.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No memberships found
            </div>
          ) : (
            <div className="space-y-3">
              {client.memberships.map((m: NonNullable<typeof client>["memberships"][number]) => {
                const isUpdating = updatingMembership === m.tenantId;
                return (
                  <div
                    key={m._id}
                    className="flex flex-col gap-3 rounded-lg border border-white/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Business info */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {m.tenantName[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.tenantName}</p>
                        <p className="text-xs text-muted-foreground">
                          @{m.tenantSlug}
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      {/* Current badges (read-only display) */}
                      <Badge
                        variant="outline"
                        className={ROLE_BADGE[m.role] ?? ROLE_BADGE.customer}
                      >
                        {m.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE[m.status] ?? STATUS_BADGE.active
                        }
                      >
                        {m.status}
                      </Badge>

                      {/* Role select */}
                      <select
                        value={m.role}
                        disabled={isUpdating || m.role === "platform_admin"}
                        onChange={(e) =>
                          handleUpdateRole(
                            m.tenantId as GenericId<"tenants">,
                            e.target.value
                          )
                        }
                        className="rounded border border-white/[0.06] bg-card px-2 py-1 text-xs text-foreground disabled:opacity-40"
                        title="Change role"
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Status select */}
                      <select
                        value={m.status}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleUpdateStatus(
                            m.tenantId as GenericId<"tenants">,
                            e.target.value
                          )
                        }
                        className="rounded border border-white/[0.06] bg-card px-2 py-1 text-xs text-foreground disabled:opacity-40"
                        title="Change status"
                      >
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="suspended">Suspended</option>
                      </select>

                      {isUpdating && (
                        <span className="text-xs text-muted-foreground">
                          Saving…
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
