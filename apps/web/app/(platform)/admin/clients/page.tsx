"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import {
  Card,
  CardContent,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@timeo/ui/web";
import { Users, Search } from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const clients = useQuery(
    api.platform.listAllUsers,
    search.trim() ? { search } : {}
  );
  const loading = clients === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            {loading
              ? "Loading clients..."
              : `${clients.length} user${clients.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : !clients || clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {search ? "No clients match your search" : "No clients yet"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search
                  ? "Try adjusting your search terms."
                  : "Users will appear here once they register."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Memberships</TableHead>
                  <TableHead>Businesses</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client._id}
                    className="cursor-pointer border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                    onClick={() =>
                      router.push(`/admin/clients/${client._id}`)
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(
                            client.name?.[0] ??
                            client.email?.[0] ??
                            "?"
                          ).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">
                          {client.name || "\u2014"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.email ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">
                        {client.membershipCount}
                      </span>
                      <span className="text-muted-foreground"> active</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">
                        {client.tenantNames.length > 0
                          ? client.tenantNames.join(", ") +
                            (client.membershipCount >
                            client.tenantNames.length
                              ? ` +${client.membershipCount - client.tenantNames.length}`
                              : "")
                          : "\u2014"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
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
