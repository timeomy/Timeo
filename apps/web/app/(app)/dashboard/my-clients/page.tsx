"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Input,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { Users2, Search, ChevronRight, AlertTriangle, Package } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CoachClient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  membershipId: string;
  role: string;
  status: string;
  totalSessions: number;
  lastSession: string | null;
  totalClasses: number | null;
  remainingClasses: number | null;
  packageName: string | null;
  packagePreset: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
};

function useMyClients() {
  const { tenantId } = useTenantId();
  return useQuery<CoachClient[]>({
    queryKey: ["coach", tenantId, "clients"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/coaches/me/clients`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load clients");
      return data.data as CoachClient[];
    },
    enabled: !!tenantId,
  });
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getSessionColor(remaining: number | null, total: number | null): string {
  if (remaining === null || total === null) return "text-white/50";
  if (remaining <= 2) return "text-red-400";
  if (remaining <= 5) return "text-amber-400";
  return "text-emerald-400";
}

function getProgressColor(remaining: number | null, total: number | null): string {
  if (remaining === null || total === null) return "bg-white/20";
  if (remaining <= 2) return "bg-red-500";
  if (remaining <= 5) return "bg-amber-500";
  return "bg-emerald-500";
}

function getExpiryColor(expiresAt: string | null): string {
  if (!expiresAt) return "text-white/40";
  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.floor((exp.getTime() - now.getTime()) / 86400000);
  if (daysLeft < 0) return "text-red-400";
  if (daysLeft <= 14) return "text-amber-400";
  return "text-white/50";
}

export default function MyClientsPage() {
  const router = useRouter();
  const { data: clients = [], isLoading } = useMyClients();
  const [search, setSearch] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users2 className="h-6 w-6 text-primary" />
            My Clients
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 h-11"
        />
      </div>

      {/* Client Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-white/[0.04] p-4 mb-4">
            <Users2 className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-base font-medium text-white/50">
            {search ? "No clients match your search" : "No clients assigned yet"}
          </p>
          <p className="text-sm text-white/30 mt-1">
            {search ? "Try a different search term" : "Ask your admin to assign clients to you"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => {
            const hasPkg = client.totalClasses !== null;
            const sessionsUsed = hasPkg ? (client.totalClasses! - (client.remainingClasses ?? 0)) : 0;
            const progress = hasPkg && client.totalClasses! > 0
              ? ((client.remainingClasses ?? 0) / client.totalClasses!) * 100
              : 0;
            const isExpired = hasPkg && (client.remainingClasses ?? 1) <= 0;
            const isLow = hasPkg && !isExpired && (client.remainingClasses ?? 999) <= 5;

            return (
              <Card
                key={client.id}
                className={cn(
                  "glass-card cursor-pointer transition-all hover:border-primary/30 hover:bg-white/[0.06] group",
                  isExpired && "border-red-500/40",
                  isLow && "border-amber-400/40",
                )}
                onClick={() => router.push(`/dashboard/my-clients/${client.id}`)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Client Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        {client.avatarUrl && <AvatarImage src={client.avatarUrl} alt={client.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white text-sm leading-tight">{client.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{client.phone ?? client.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-primary transition-colors mt-1" />
                  </div>

                  {/* Package Badge */}
                  {hasPkg && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {client.packagePreset && (
                        <Badge className="text-xs bg-primary/20 text-primary border-0 font-bold">
                          {client.packagePreset}
                        </Badge>
                      )}
                      {client.packageName && !client.packagePreset && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
                          <Package className="h-3 w-3 mr-1" />
                          {client.packageName}
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Session Counter */}
                  {hasPkg && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Sessions used</span>
                        <span className={cn("font-bold", getSessionColor(client.remainingClasses, client.totalClasses))}>
                          {sessionsUsed} / {client.totalClasses}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", getProgressColor(client.remainingClasses, client.totalClasses))}
                          style={{ width: `${100 - progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-semibold", getSessionColor(client.remainingClasses, client.totalClasses))}>
                          {client.remainingClasses} remaining
                        </span>
                        {client.expiresAt && (
                          <span className={cn("text-xs", getExpiryColor(client.expiresAt))}>
                            Exp {client.expiresAt}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasPkg && (
                    <div className="text-xs text-white/30 italic">No active PT package</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
