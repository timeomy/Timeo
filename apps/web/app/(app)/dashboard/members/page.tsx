"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
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
  cn,
} from "@timeo/ui/web";
import {
  Search,
  UserCheck,
  AlertCircle,
  CreditCard,
  ScanLine,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/20 text-primary border-primary/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
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

  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId } : "skip",
  );

  const credits = useQuery(
    api.sessionCredits.listByTenant,
    tenantId ? { tenantId } : "skip",
  );

  const checkIns = useQuery(
    api.checkIns.listByTenant,
    tenantId ? { tenantId } : "skip",
  );

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

  // Build per-user credit/check-in summaries
  function getUserCredits(userId: string) {
    if (!credits) return { total: 0, used: 0, remaining: 0 };
    const userCredits = credits.filter((c: any) => c.userId === userId);
    const total = userCredits.reduce((s: number, c: any) => s + c.totalSessions, 0);
    const used = userCredits.reduce((s: number, c: any) => s + c.usedSessions, 0);
    return { total, used, remaining: total - used };
  }

  function getLastCheckIn(userId: string) {
    if (!checkIns) return null;
    const userCheckIns = checkIns.filter((ci: any) => ci.userId === userId);
    if (userCheckIns.length === 0) return null;
    return userCheckIns[0]?.timestamp ?? null;
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatRelative(timestamp: number) {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
    return formatDate(timestamp);
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
            {members === undefined
              ? "Loading..."
              : `${members.length} member${members.length !== 1 ? "s" : ""}`}
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
          {members === undefined ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member: any) => {
                  const userCred = getUserCredits(member.userId);
                  const lastCheckIn = getLastCheckIn(member.userId);
                  const isExpanded = expandedId === member._id;

                  return (
                    <>
                      <TableRow
                        key={member._id}
                        className={cn(
                          "border-white/[0.06] hover:bg-white/[0.02] cursor-pointer",
                          isExpanded && "bg-white/[0.02]",
                        )}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : member._id)
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
                                {member.userEmail ?? "—"}
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
                            : "—"}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <TableRow
                          key={`${member._id}-detail`}
                          className="border-white/[0.06] bg-white/[0.01]"
                        >
                          <TableCell colSpan={6}>
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
                                    : "—"}
                                </p>
                              </div>
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
    </div>
  );
}

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
