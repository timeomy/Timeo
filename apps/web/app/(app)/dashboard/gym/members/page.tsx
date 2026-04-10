"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import { MemberDetailPanel } from "@/member/member-detail-panel";
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
  Sheet,
  SheetContent,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Search,
  UserCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type GymMember = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  membershipStatus: "active" | "expired" | "suspended";
  membershipRole: string | null;
  memberId: string | null;
  faceEnrolled: boolean;
  lastCheckIn: string | null;
};

type RawGymMember = {
  membership?: {
    role?: string;
    status?: string;
    memberId?: string | null;
  };
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string | null;
  };
};

type MembersPageData = {
  members: GymMember[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

function toGymMember(item: RawGymMember): GymMember {
  const status = item.membership?.status;
  const membershipStatus: GymMember["membershipStatus"] =
    status === "active"
      ? "active"
      : status === "suspended"
        ? "suspended"
        : "expired";

  return {
    id: item.user?.id ?? item.membership?.memberId ?? "",
    name: item.user?.name ?? "",
    email: item.user?.email ?? "",
    photoUrl: item.user?.avatarUrl ?? null,
    membershipStatus,
    membershipRole: item.membership?.role ?? null,
    memberId: item.membership?.memberId ?? null,
    faceEnrolled: false,
    lastCheckIn: null,
  };
}

function useGymMembers({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { tenantId } = useTenantId();

  return useQuery<MembersPageData>({
    queryKey: ["gym", tenantId, "members", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) {
        params.set("search", search);
      }

      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members?${params.toString()}`,
        { credentials: "include" },
      );
      const payload = await res.json();

      if (!payload.success) {
        throw new Error(payload.error?.message || "Failed to load members");
      }

      const result = payload.data;
      const rawList: RawGymMember[] = Array.isArray(result)
        ? result
        : (result?.members ?? []);
      const pagination = Array.isArray(result)
        ? {
            total: rawList.length,
            page,
            limit: PAGE_SIZE,
            totalPages: 1,
          }
        : {
            total: Number(result?.pagination?.total ?? 0),
            page: Number(result?.pagination?.page ?? page),
            limit: Number(result?.pagination?.limit ?? PAGE_SIZE),
            totalPages: Math.max(1, Number(result?.pagination?.totalPages ?? 1)),
          };

      return {
        members: rawList.map(toGymMember),
        pagination,
      };
    },
    enabled: !!tenantId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

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

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  const maxVisiblePages = 5;
  const startPage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - maxVisiblePages + 1),
  );
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
}

export default function GymMembersPage() {
  const router = useRouter();
  const { tenantId } = useTenantId();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useGymMembers({ page, search });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const members = data?.members ?? [];
  const pagination = data?.pagination ?? {
    total: 0,
    page,
    limit: PAGE_SIZE,
    totalPages: 1,
  };
  const totalPages = Math.max(1, pagination.totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(page, totalPages),
    [page, totalPages],
  );

  const showInitialLoading = isLoading && !data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/gym")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gym Members
            </h1>
            <p className="text-sm text-muted-foreground">
              {showInitialLoading
                ? "Loading..."
                : `${pagination.total} member${pagination.total !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() => router.push("/dashboard/gym/members/new")}
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search by name, email, or member ID..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {showInitialLoading ? (
            <LoadingSkeleton />
          ) : members.length === 0 ? (
            <EmptyState isSearching={Boolean(search)} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Photo</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Membership</TableHead>
                  <TableHead className="text-muted-foreground">Face Enrolled</TableHead>
                  <TableHead className="text-muted-foreground">Last Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                      role="link"
                      tabIndex={0}
                      onClick={() => setSelectedMemberId(member.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedMemberId(member.id);
                        }
                      }}
                    >
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          {member.photoUrl && (
                            <AvatarImage src={member.photoUrl} alt={member.name} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {getInitial(member.name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        {member.memberId && (
                          <p className="text-xs text-muted-foreground">ID: {member.memberId}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            STATUS_BADGE[member.membershipStatus] ?? STATUS_BADGE.expired,
                          )}
                        >
                          {member.membershipStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.faceEnrolled ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </TableCell>
                      <TableCell>
                        {member.lastCheckIn ? (
                          <span className="text-sm text-muted-foreground">
                            {formatRelative(member.lastCheckIn)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/70">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {totalPages} ({pagination.total} members)
              {isFetching && " · Updating..."}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  size="sm"
                  variant={pageNumber === page ? "default" : "outline"}
                  className="h-8 min-w-8 px-2"
                  disabled={isFetching}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={page >= totalPages || isFetching}
                onClick={() =>
                  setPage((currentPage) =>
                    Math.min(totalPages, currentPage + 1),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Sheet
        open={Boolean(selectedMemberId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMemberId(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full max-w-full sm:max-w-[480px] p-0">
          <MemberDetailPanel tenantId={tenantId} memberId={selectedMemberId} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        {isSearching ? (
          <Search className="h-6 w-6 text-muted-foreground" />
        ) : (
          <UserCheck className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {isSearching ? "No members match your search" : "No members yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground/80">
        {isSearching
          ? "Try adjusting your search query."
          : "Members will appear here once they are added to your gym."}
      </p>
    </div>
  );
}
