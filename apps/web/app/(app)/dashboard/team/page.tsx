"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  Skeleton,
} from "@timeo/ui/web";
import { Users, UserPlus, Ban, Search } from "lucide-react";

type MemberRole = "admin" | "staff" | "customer";

const ROLE_OPTIONS: Array<{ label: string; value: MemberRole }> = [
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  admin: "bg-primary/20 text-primary border-primary/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  invited: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TeamPage() {
  const { tenantId } = useTenantId();

  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId: tenantId } : "skip"
  );

  const updateRole = useMutation(api.tenantMemberships.updateRole);
  const suspendMember = useMutation(api.tenantMemberships.suspend);
  const inviteMember = useMutation(api.tenantMemberships.invite);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("staff");
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const lookedUpUser = useQuery(
    api.users.getByEmail,
    lookupEmail ? { email: lookupEmail } : "skip"
  );

  const foundUser = lookedUpUser ?? null;
  const lookupStatus: "idle" | "searching" | "found" | "not_found" =
    lookupEmail === null
      ? "idle"
      : lookedUpUser === undefined
        ? "searching"
        : lookedUpUser !== null
          ? "found"
          : "not_found";

  function handleLookup() {
    if (!inviteEmail.trim()) return;
    setLookupEmail(inviteEmail.trim());
  }

  async function handleInvite() {
    if (!tenantId || !foundUser) return;
    setSaving("invite");
    try {
      await inviteMember({
        tenantId: tenantId,
        userId: foundUser._id,
        role: inviteRole,
      });
      setInviteOpen(false);
      resetInviteForm();
    } catch (err: any) {
      alert(err.message || "Failed to invite member.");
    } finally {
      setSaving(null);
    }
  }

  function resetInviteForm() {
    setInviteEmail("");
    setLookupEmail(null);
  }

  async function handleRoleChange(membershipId: GenericId<"tenantMemberships">, role: MemberRole) {
    if (!tenantId) return;
    setSaving(membershipId);
    try {
      await updateRole({
        tenantId: tenantId,
        membershipId,
        role,
      });
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally {
      setSaving(null);
    }
  }

  async function handleSuspend(membershipId: GenericId<"tenantMemberships">) {
    if (!tenantId) return;
    if (!confirm("Are you sure you want to suspend this member?")) return;
    setSaving(membershipId);
    try {
      await suspendMember({
        tenantId: tenantId,
        membershipId,
      });
    } catch (err: any) {
      alert(err.message || "Failed to suspend member.");
    } finally {
      setSaving(null);
    }
  }

  const loading = members === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-muted-foreground">
            {loading
              ? "Loading members..."
              : `${members?.length ?? 0} member${(members?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) resetInviteForm();
          }}
        >
          <DialogTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Look up a user by email to invite them to your team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setInviteEmail(e.target.value);
                      setLookupEmail(null);
                    }}
                    type="email"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLookup}
                    disabled={!inviteEmail.trim()}
                    className="shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {lookupStatus === "searching" && (
                  <p className="text-sm text-white/50">
                    Searching...
                  </p>
                )}
                {lookupStatus === "not_found" && (
                  <p className="text-sm text-yellow-400">
                    No user found with that email. They must sign up first before you can invite them.
                  </p>
                )}
                {foundUser && (
                  <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {(foundUser.name?.[0] || foundUser.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {foundUser.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {foundUser.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Select
                label="Role"
                options={ROLE_OPTIONS}
                value={inviteRole}
                onChange={(value: string) => setInviteRole(value as MemberRole)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!foundUser || saving === "invite"}
              >
                {saving === "invite" ? "Inviting..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                No team members yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Invite your first team member to start collaborating.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => (
                  <TableRow key={member._id} className="border-white/[0.06]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(
                            member.userName?.[0] ||
                            member.userEmail?.[0] ||
                            "?"
                          ).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.userName || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.userEmail || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          ROLE_BADGE_VARIANTS[member.role] ||
                          ROLE_BADGE_VARIANTS.customer
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_VARIANTS[member.status] ||
                          STATUS_BADGE_VARIANTS.active
                        }
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          options={ROLE_OPTIONS}
                          value={member.role}
                          onChange={(role: string) =>
                            handleRoleChange(member._id, role as MemberRole)
                          }
                          disabled={saving === member._id}
                          className="w-[120px]"
                        />
                        {member.status !== "suspended" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(member._id)}
                            disabled={saving === member._id}
                            className="h-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
