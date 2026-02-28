"use client";

import { useState, useMemo } from "react";
import {
  useStaffMembers,
  useSessionCredits,
  useCheckIns,
  useSessionPackages,
  useUpdateStaffRole,
  useAssignSessionPackage,
  useAdjustSessionCredits,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
  Select,
  cn,
} from "@timeo/ui/web";
import {
  Search,
  UserCheck,
  CreditCard,
  ScanLine,
  Settings2,
  Plus,
  Package,
  Pencil,
  Loader2,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/20 text-primary border-primary/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  platform_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  invited: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MembersPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Credit management dialog state
  const [manageMember, setManageMember] = useState<any>(null);
  const [assignPackageOpen, setAssignPackageOpen] = useState(false);
  const [adjustCreditId, setAdjustCreditId] = useState<string | null>(null);

  const { data: members, isLoading } = useStaffMembers(tenantId ?? "");
  const { data: allCredits } = useSessionCredits(tenantId ?? "");
  const { data: checkIns } = useCheckIns(tenantId ?? "");
  const { data: packages } = useSessionPackages(tenantId ?? "");

  const filtered =
    members?.filter(
      (m: any) =>
        (m.userName ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (m.userEmail ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];

  const creditsByUser = useMemo(() => {
    if (!allCredits) return {};
    return allCredits.reduce((acc: Record<string, typeof allCredits>, credit: any) => {
      const key = credit.userId as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(credit);
      return acc;
    }, {});
  }, [allCredits]);

  function getUserCredits(userId: string) {
    const userCredits = creditsByUser[userId] ?? [];
    if (userCredits.length === 0) return { total: 0, used: 0, remaining: 0, items: [] };
    const total = userCredits.reduce((s: number, c: any) => s + c.totalSessions, 0);
    const used = userCredits.reduce((s: number, c: any) => s + c.usedSessions, 0);
    return { total, used, remaining: total - used, items: userCredits };
  }

  const checkInsByUser = useMemo(() => {
    if (!checkIns) return {};
    return checkIns.reduce((acc: Record<string, string>, ci: any) => {
      const key = ci.userId as string;
      const ts = ci.checkedInAt as string;
      if (!acc[key] || ts > acc[key]) acc[key] = ts;
      return acc;
    }, {});
  }, [checkIns]);

  function getLastCheckIn(userId: string) {
    return checkInsByUser[userId] ?? null;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatRelative(isoString: string) {
    const diff = Date.now() - new Date(isoString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
    return formatDate(isoString);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Members
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${members?.length ?? 0} member${(members?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState hasMembers={(members?.length ?? 0) > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Member</TableHead>
                  <TableHead className="text-white/50">Role</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">
                    Credits Remaining
                  </TableHead>
                  <TableHead className="text-white/50">Last Check-in</TableHead>
                  <TableHead className="text-white/50">Joined</TableHead>
                  <TableHead className="text-white/50 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member: any) => {
                  const userCred = getUserCredits(member.userId);
                  const lastCheckIn = getLastCheckIn(member.userId);
                  const isExpanded = expandedId === member.id;

                  return (
                    <>
                      <TableRow
                        key={member.id}
                        className={cn(
                          "border-white/[0.06] hover:bg-white/[0.02] cursor-pointer",
                          isExpanded && "bg-white/[0.02]",
                        )}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : member.id)
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {(
                                member.userName?.[0] ??
                                member.userEmail?.[0] ??
                                "?"
                              ).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {member.userName ?? "Unknown"}
                              </p>
                              <p className="text-xs text-white/40">
                                {member.userEmail ?? "\u2014"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              ROLE_BADGE[member.role] ?? ROLE_BADGE.customer
                            }
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_BADGE[member.status] ??
                              STATUS_BADGE.active
                            }
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-white/40" />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                userCred.remaining > 0
                                  ? "text-emerald-400"
                                  : "text-white/40",
                              )}
                            >
                              {userCred.remaining}
                            </span>
                            <span className="text-xs text-white/30">
                              / {userCred.total}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lastCheckIn ? (
                            <div className="flex items-center gap-1.5 text-white/70">
                              <ScanLine className="h-3.5 w-3.5 text-white/40" />
                              {formatRelative(lastCheckIn)}
                            </div>
                          ) : (
                            <span className="text-white/30">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {member.joinedAt
                            ? formatDate(member.joinedAt)
                            : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-white/40 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManageMember(member);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <TableRow
                          key={`${member.id}-detail`}
                          className="border-white/[0.06] bg-white/[0.01]"
                        >
                          <TableCell colSpan={7}>
                            <div className="grid gap-4 py-2 sm:grid-cols-3">
                              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                <p className="text-xs text-white/40 mb-1">
                                  Session Credits
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {userCred.remaining}{" "}
                                  <span className="text-sm font-normal text-white/40">
                                    remaining
                                  </span>
                                </p>
                                <p className="text-xs text-white/30">
                                  {userCred.used} used of {userCred.total} total
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                <p className="text-xs text-white/40 mb-1">
                                  Last Check-in
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {lastCheckIn
                                    ? formatRelative(lastCheckIn)
                                    : "Never"}
                                </p>
                                {lastCheckIn && (
                                  <p className="text-xs text-white/30">
                                    {formatDate(lastCheckIn)}
                                  </p>
                                )}
                              </div>
                              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                <p className="text-xs text-white/40 mb-1">
                                  Membership
                                </p>
                                <p className="text-lg font-bold text-white capitalize">
                                  {member.role}
                                </p>
                                <p className="text-xs text-white/30 capitalize">
                                  {member.status} since{" "}
                                  {member.joinedAt
                                    ? formatDate(member.joinedAt)
                                    : "\u2014"}
                                </p>
                              </div>
                            </div>

                            {/* Per-package credit breakdown */}
                            {userCred.items.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-white/50">
                                  Credit Breakdown
                                </p>
                                {userCred.items.map((credit: any) => (
                                  <div
                                    key={credit.id}
                                    className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Package className="h-3.5 w-3.5 text-white/40" />
                                      <span className="text-sm text-white">
                                        {credit.packageName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-white/70">
                                        {credit.remaining}/{credit.totalSessions} remaining
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1 px-2 text-xs text-white/40 hover:text-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setManageMember(member);
                                          setAdjustCreditId(credit.id);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                        Adjust
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageMember(member);
                                  setAssignPackageOpen(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Assign Package
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageMember(member);
                                }}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                Manage
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manage Member Dialog — always re-derive from live query data */}
      {manageMember && tenantId && (() => {
        const liveMember = members?.find((m: any) => m.id === manageMember.id) ?? manageMember;
        return (
          <ManageMemberDialog
            member={liveMember}
            tenantId={tenantId}
            credits={getUserCredits(liveMember.userId).items}
            packages={packages ?? []}
            initialAssignOpen={assignPackageOpen}
            initialAdjustCreditId={adjustCreditId}
            onClose={() => {
              setManageMember(null);
              setAssignPackageOpen(false);
              setAdjustCreditId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ─── Manage Member Dialog ──────────────────────────────────────────────────

function ManageMemberDialog({
  member,
  tenantId,
  credits,
  packages,
  initialAssignOpen,
  initialAdjustCreditId,
  onClose,
}: {
  member: any;
  tenantId: string;
  credits: any[];
  packages: any[];
  initialAssignOpen: boolean;
  initialAdjustCreditId: string | null;
  onClose: () => void;
}) {
  const { mutateAsync: updateRole } = useUpdateStaffRole(tenantId);
  const { mutateAsync: assignPackage } = useAssignSessionPackage(tenantId);
  const { mutateAsync: adjustCredits } = useAdjustSessionCredits(tenantId);

  const [view, setView] = useState<"main" | "assign" | "adjust">(
    initialAssignOpen ? "assign" : initialAdjustCreditId ? "adjust" : "main"
  );
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [editCreditId, setEditCreditId] = useState<string | null>(initialAdjustCreditId);
  const [editTotal, setEditTotal] = useState("");
  const [editUsed, setEditUsed] = useState("");
  const [roleValue, setRoleValue] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activePackages = packages.filter((p: any) => p.isActive);

  async function handleRoleChange(newRole: string) {
    if (newRole === member.role) return;
    setSaving(true);
    setError("");
    try {
      await updateRole({ userId: member.userId ?? member.id, role: newRole as any });
      setRoleValue(newRole);
      setSuccess("Role updated");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignPackage() {
    if (!selectedPackageId) return;
    setSaving(true);
    setError("");
    try {
      await assignPackage({
        userId: member.userId ?? member.id,
        packageId: selectedPackageId,
      });
      setSuccess("Package assigned");
      setSelectedPackageId("");
      setTimeout(() => {
        setSuccess("");
        setView("main");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to assign package");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustCredits() {
    if (!editCreditId) return;
    setSaving(true);
    setError("");
    try {
      await adjustCredits({
        creditId: editCreditId,
        totalSessions: editTotal !== "" ? parseInt(editTotal, 10) : undefined,
        usedSessions: editUsed !== "" ? parseInt(editUsed, 10) : undefined,
      });
      setSuccess("Credits adjusted");
      setTimeout(() => {
        setSuccess("");
        setView("main");
        setEditCreditId(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to adjust credits");
    } finally {
      setSaving(false);
    }
  }

  function startAdjust(credit: any) {
    setEditCreditId(credit.id);
    setEditTotal(String(credit.totalSessions));
    setEditUsed(String(credit.usedSessions));
    setError("");
    setSuccess("");
    setView("adjust");
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {(member.userName?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <span>{member.userName ?? "Unknown"}</span>
              <p className="text-xs font-normal text-muted-foreground">
                {member.userEmail}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {view === "main" && (
          <div className="space-y-4">
            {/* Role */}
            <Select
              label="Role"
              value={roleValue}
              onChange={handleRoleChange}
              disabled={saving}
              options={[
                { label: "Customer", value: "customer" },
                { label: "Staff", value: "staff" },
                { label: "Admin", value: "admin" },
              ]}
            />

            <Separator className="bg-white/[0.06]" />

            {/* Session Credits */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Session Credits
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("assign");
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Assign Package
                </Button>
              </div>

              {credits.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No credits assigned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {credits.map((credit: any) => {
                    const remaining = credit.totalSessions - credit.usedSessions;
                    const pct = credit.totalSessions > 0
                      ? (remaining / credit.totalSessions) * 100
                      : 0;
                    return (
                      <div
                        key={credit.id}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {credit.packageName}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => startAdjust(credit)}
                          >
                            <Pencil className="h-3 w-3" />
                            Adjust
                          </Button>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {credit.usedSessions} used / {credit.totalSessions} total
                          </span>
                          <span
                            className={cn(
                              "font-semibold",
                              remaining > 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {remaining} left
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct > 50
                                ? "bg-emerald-500"
                                : pct > 20
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {credit.expiresAt && (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Expires: {new Date(credit.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "assign" && (
          <div className="space-y-4">
            <DialogDescription>
              Assign a session package to {member.userName ?? "this member"}.
            </DialogDescription>

            {activePackages.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No active packages available. Create one in the Packages page first.
              </p>
            ) : (
              <div className="space-y-2">
                {activePackages.map((pkg: any) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                      selectedPackageId === pkg.id
                        ? "border-primary bg-primary/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        {pkg.sessionCount} sessions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.currency} {pkg.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setView("main");
                  setError("");
                  setSuccess("");
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleAssignPackage}
                disabled={saving || !selectedPackageId}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Package"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {view === "adjust" && editCreditId && (
          <div className="space-y-4">
            <DialogDescription>
              Adjust session credit balance for {member.userName ?? "this member"}.
            </DialogDescription>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Total Sessions
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Used Sessions
                </label>
                <Input
                  type="number"
                  min={0}
                  max={editTotal ? parseInt(editTotal) : undefined}
                  value={editUsed}
                  onChange={(e) => setEditUsed(e.target.value)}
                />
              </div>
            </div>

            {editTotal && editUsed && (
              <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm">
                Remaining:{" "}
                <span className="font-semibold text-emerald-400">
                  {Math.max(0, parseInt(editTotal || "0") - parseInt(editUsed || "0"))}
                </span>{" "}
                sessions
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setView("main");
                  setEditCreditId(null);
                  setError("");
                  setSuccess("");
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleAdjustCredits}
                disabled={saving || (!editTotal && !editUsed)}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Supporting Components ─────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28 bg-white/[0.06]" />
            <Skeleton className="h-3 w-36 bg-white/[0.06]" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-4 w-12 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasMembers }: { hasMembers: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        {hasMembers ? (
          <Search className="h-6 w-6 text-white/30" />
        ) : (
          <UserCheck className="h-6 w-6 text-white/30" />
        )}
      </div>
      <p className="text-sm font-medium text-white/50">
        {hasMembers ? "No members match your search" : "No members yet"}
      </p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">
        {hasMembers
          ? "Try adjusting your search query."
          : "Members will appear here once they join your business."}
      </p>
    </div>
  );
}
