"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
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
  Users2,
  Eye,
} from "lucide-react";

import { useCustomers } from "@timeo/api-client";

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

const TAG_COLORS: Record<string, string> = {
  vip: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  regular: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-red-500/15 text-red-400 border-red-500/30",
  loyal: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? "bg-white/[0.06] text-white/60 border-white/[0.08]";
}

export default function CustomersPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useCustomers(tenantId ?? "");

  const filtered =
    customers?.filter(
      (c: any) =>
        (c.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (c.email ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Customers
          </h1>
          <p className="text-sm text-white/50">
            Manage customer profiles and history
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
            <EmptyState hasCustomers={(customers?.length ?? 0) > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Name</TableHead>
                  <TableHead className="text-white/50">Email</TableHead>
                  <TableHead className="text-white/50">Bookings</TableHead>
                  <TableHead className="text-white/50">Total Spend</TableHead>
                  <TableHead className="text-white/50">Last Visit</TableHead>
                  <TableHead className="text-white/50">Tags</TableHead>
                  <TableHead className="text-white/50 w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer: any) => (
                  <TableRow
                    key={customer.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(
                            customer.name?.[0] ??
                            customer.email?.[0] ??
                            "?"
                          ).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {customer.name ?? "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70">
                      {customer.email ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {customer.bookingCount ?? 0}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatPrice(customer.totalSpend ?? 0, "MYR")}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {customer.lastVisit
                        ? formatRelative(customer.lastVisit)
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(customer.tags ?? []).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={cn("text-xs", getTagColor(tag))}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white/40 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
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
          <Skeleton className="h-4 w-12 bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasCustomers }: { hasCustomers: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        {hasCustomers ? (
          <Search className="h-6 w-6 text-white/30" />
        ) : (
          <Users2 className="h-6 w-6 text-white/30" />
        )}
      </div>
      <p className="text-sm font-medium text-white/50">
        {hasCustomers ? "No customers match your search" : "No customers yet"}
      </p>
      <p className="text-xs text-white/30 mt-1 max-w-xs">
        {hasCustomers
          ? "Try adjusting your search query."
          : "Customers will appear here once they interact with your business."}
      </p>
    </div>
  );
}
