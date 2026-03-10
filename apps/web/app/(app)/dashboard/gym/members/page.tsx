"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
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
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type GymMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  membershipStatus: "active" | "expired" | "suspended";
  membershipPlan: string | null;
  faceEnrolled: boolean;
  lastCheckIn: string | null;
};

// ---- Data hook ----

function useGymMembers() {
  const { tenantId } = useTenantId();
  return useQuery<GymMember[]>({
    queryKey: ["gym", tenantId, "/members"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load members");
      return data.data as GymMember[];
    },
    enabled: !!tenantId,
  });
}

// ---- Helpers ----

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function formatRelative(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
  return new Date(isoString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitial(name: string | null, email: string | null) {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

// ---- Page ----

export default function GymMembersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useGymMembers();

  const filtered =
    members?.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-white/50 hover:text-white"
            onClick={() => router.push("/dashboard/gym")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Gym Members
            </h1>
            <p className="text-sm text-white/50">
              {isLoading
                ? "Loading..."
                : `${members?.length ?? 0} member${(members?.length ?? 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
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
                  <TableHead className="text-white/50">Photo</TableHead>
                  <TableHead className="text-white/50">Name</TableHead>
                  <TableHead className="text-white/50">Email</TableHead>
                  <TableHead className="text-white/50">Membership</TableHead>
                  <TableHead className="text-white/50">Face Enrolled</TableHead>
                  <TableHead className="text-white/50">Last Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => (
                  <TableRow
                    key={member.id}
                    className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/gym/members/${member.id}`)
                    }
                  >
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={member.photoUrl ?? undefined}
                          alt={member.name}
                        />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {getInitial(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-white">
                        {member.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-white/60">{member.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          STATUS_BADGE[member.membershipStatus] ??
                            STATUS_BADGE.expired,
                        )}
                      >
                        {member.membershipStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.faceEnrolled ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-white/20" />
                      )}
                    </TableCell>
                    <TableCell>
                      {member.lastCheckIn ? (
                        <span className="text-sm text-white/60">
                          {formatRelative(member.lastCheckIn)}
                        </span>
                      ) : (
                        <span className="text-sm text-white/30">Never</span>
                      )}
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

// ---- Supporting Components ----

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28 bg-white/[0.06]" />
            <Skeleton className="h-3 w-36 bg-white/[0.06]" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-5 w-5 rounded bg-white/[0.06]" />
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
          : "Members will appear here once they are added to your gym."}
      </p>
    </div>
  );
}
