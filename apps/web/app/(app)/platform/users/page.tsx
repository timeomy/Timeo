"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Select,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@timeo/ui/web";
import { Users, Search, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersResponse {
  items: PlatformUser[];
  total: number;
  page: number;
  limit: number;
}

const roleOptions = [
  { label: "All Roles", value: "all" },
  { label: "Platform Admin", value: "platform_admin" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
];

const roleColors: Record<string, string> = {
  platform_admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatLastLogin(ts: string | null) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(search && { search }),
    ...(roleFilter !== "all" && { role: roleFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "users", "list", page, search, roleFilter, statusFilter],
    queryFn: () =>
      api.get<UsersResponse>(`/api/platform/users?${params.toString()}`),
    staleTime: 30_000,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-muted-foreground">
          {isLoading ? "Loading users..." : `${total} total users across all tenants`}
        </p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={handleRoleFilter}
              className="sm:w-44"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusFilter}
              className="sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {search || roleFilter !== "all" || statusFilter !== "all"
                  ? "No users match your filters."
                  : "No users found."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Tenants</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/[0.06]">
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleColors[user.role] ?? ""}
                      >
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[user.status] ?? ""}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {user.tenantCount}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatLastLogin(user.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/platform/users/${user.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} users)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
