"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import type { GenericId } from "convex/values";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import { ArrowLeft, Building2, CalendarDays, Mail } from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as GenericId<"users">;

  const client = useQuery(api.platform.getUserById, { userId });

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
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {(
              client.name?.[0] ??
              client.email?.[0] ??
              "?"
            ).toUpperCase()}
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
              <p className="text-2xl font-bold">
                {client.recentBookingCount}
              </p>
              <p className="text-xs text-muted-foreground">Recent Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="truncate text-sm font-medium">
                {client.email ?? "\u2014"}
              </p>
              <p className="text-xs text-muted-foreground">Email</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memberships */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {client.memberships.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No memberships found
            </div>
          ) : (
            <div className="space-y-3">
              {client.memberships.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {m.tenantName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.tenantName}</p>
                      <p className="text-xs text-muted-foreground">
                        @{m.tenantSlug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        ROLE_BADGE[m.role] ?? ROLE_BADGE.customer
                      }
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
