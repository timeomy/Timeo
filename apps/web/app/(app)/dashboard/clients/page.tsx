"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenantId } from "@/hooks/use-tenant-id";
import { getInitials } from "@timeo/shared";
import { useGymMembers } from "@timeo/api-client";
import type { GymMember } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Search,
  Users2,
  NotebookPen,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Shield,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  staff: {
    label: "Coach",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  customer: {
    label: "Member",
    className: "bg-white/10 text-white/60 border-white/[0.08]",
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  inactive: {
    label: "Inactive",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  suspended: {
    label: "Suspended",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
};

function ClientCard({ member, index }: { member: GymMember; index: number }) {
  const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.customer;
  const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.inactive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <Link href={`/dashboard/gym/members`}>
        <Card className="glass-card transition-all hover:border-primary/20 hover:bg-white/[0.04] cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <Avatar className="h-12 w-12 shrink-0">
                {(member.avatarUrl) && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white truncate">{member.name}</p>
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", statusCfg.className)}
                  >
                    {statusCfg.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", roleCfg.className)}
                  >
                    {roleCfg.label}
                  </Badge>
                </div>
                <p className="text-sm text-white/50 truncate mt-0.5">{member.email}</p>
              </div>

              <ChevronRight className="h-4 w-4 text-white/30 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function ClientCardSkeleton() {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientsPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "staff" | "admin">("all");

  const { data: members, isLoading } = useGymMembers(tenantId ?? "");

  const filtered = (members ?? []).filter((m) => {
    const matchesSearch =
      !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const counts = {
    all: members?.length ?? 0,
    active: members?.filter((m) => m.status === "active").length ?? 0,
    customer: members?.filter((m) => m.role === "customer").length ?? 0,
    staff: members?.filter((m) => m.role === "staff").length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Clients</h1>
          <p className="mt-1 text-sm text-white/50">
            {isLoading ? "Loading..." : `${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/session-logs">
            <Button variant="outline" size="sm" className="gap-2 min-h-[44px]">
              <NotebookPen className="h-4 w-4" />
              Log Session
            </Button>
          </Link>
          <Link href="/dashboard/gym/members">
            <Button size="sm" className="gap-2 min-h-[44px]">
              <UserPlus className="h-4 w-4" />
              View All Members
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-2xl font-bold text-white">{counts.all}</p>
          <p className="text-xs text-white/40 mt-0.5">Total Members</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-2xl font-bold text-emerald-400">{counts.active}</p>
          <p className="text-xs text-emerald-400/60 mt-0.5">Active</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-2xl font-bold text-primary">{counts.customer}</p>
          <p className="text-xs text-primary/60 mt-0.5">Gym Members</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "customer", "staff", "admin"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium border transition-all",
              roleFilter === role
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            {role === "all" ? "All" : role === "customer" ? "Members" : role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 min-h-[44px] bg-white/[0.03] border-white/[0.08]"
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <Users2 className="h-12 w-12 text-white/20 mb-4" />
          <p className="text-white/60 font-medium">
            {search || roleFilter !== "all" ? "No clients match your filters" : "No clients yet"}
          </p>
          <p className="text-white/30 text-sm mt-1">
            {search || roleFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Members of your gym will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((member, index) => (
            <ClientCard key={member.userId} member={member} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
