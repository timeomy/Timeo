"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Badge,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { Dumbbell, Search, Filter, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type TrainingLog = {
  id: string;
  clientId: string;
  sessionType: string;
  trainingTypes: string[];
  notes?: string;
  exercises: Array<{ name: string; sets?: number; reps?: number; weight?: number }>;
  weightKg?: number | null;
  sessionsUsed?: number;
  published: boolean;
  createdAt: string;
  clientName: string;
  clientEmail: string;
  clientAvatar?: string;
};

type CoachClient = {
  id: string;
  name: string;
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  pull: { bg: "bg-blue-500/20", text: "text-blue-400" },
  push: { bg: "bg-orange-500/20", text: "text-orange-400" },
  legs: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function TrainingLogsPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Build URL with filters
  const logsUrl = () => {
    const url = new URL(`${API_URL}/api/tenants/${tenantId}/coaches/training-logs`);
    if (filterType) url.searchParams.set("type", filterType);
    if (dateFrom) url.searchParams.set("date_from", dateFrom);
    if (dateTo) url.searchParams.set("date_to", dateTo);
    return url.toString();
  };

  const { data: logs = [], isLoading } = useQuery<TrainingLog[]>({
    queryKey: ["coach", tenantId, "training-logs-all", filterType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(logsUrl(), { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    enabled: !!tenantId,
  });

  const filtered = logs.filter((log) => {
    if (!search) return true;
    return log.clientName?.toLowerCase().includes(search.toLowerCase());
  });

  const activeFilters = [filterType, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          Training Logs
        </h1>
        <p className="text-sm text-white/50 mt-1">All sessions across your clients</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 h-11"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-11 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all",
            showFilters || activeFilters > 0
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:border-white/20",
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          {/* Training Type Filter */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Training Type</label>
            <div className="flex gap-2 flex-wrap">
              {["", "pull", "push", "legs"].map((type) => {
                const colors = type ? TYPE_COLORS[type] : null;
                return (
                  <button
                    key={type || "all"}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all",
                      filterType === type
                        ? colors
                          ? `${colors.bg} ${colors.text} border-current`
                          : "bg-primary/20 text-primary border-primary/40"
                        : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:border-white/20",
                    )}
                  >
                    {type || "All"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm bg-background border-border/40 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm bg-background border-border/40 text-white"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterType(""); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {!isLoading && (
        <p className="text-xs text-white/40">
          Showing {filtered.length} log{filtered.length !== 1 ? "s" : ""}
          {search ? ` for "${search}"` : ""}
        </p>
      )}

      {/* Log List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <Dumbbell className="h-7 w-7 text-white/20" />
          </div>
          <p className="text-base font-semibold text-white/60">
            {(search || activeFilters > 0) ? "No matching training logs" : "No training logs yet"}
          </p>
          <p className="mt-1.5 text-sm text-white/30 max-w-xs">
            {(search || activeFilters > 0)
              ? "Try adjusting your search or filters"
              : "Log your first training session by visiting a client profile"}
          </p>
          {!search && activeFilters === 0 && (
            <a
              href="/dashboard/my-clients"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              View My Clients
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <Card key={log.id} className="glass-card hover:border-white/20 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Client */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {(log.clientAvatar) && <AvatarImage src={log.clientAvatar} alt={log.clientName} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(log.clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{log.clientName}</p>
                      <p className="text-xs text-white/40">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* Training type badges */}
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(log.trainingTypes ?? []).length > 0
                        ? (log.trainingTypes ?? []).map((t) => {
                            const colors = TYPE_COLORS[t] ?? { bg: "bg-white/10", text: "text-white/60" };
                            return (
                              <span key={t} className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                                {t}
                              </span>
                            );
                          })
                        : (
                          <Badge variant="outline" className="text-xs border-white/10 text-white/40">
                            {log.sessionType?.replace(/_/g, " ")}
                          </Badge>
                        )
                      }
                    </div>
                    {/* Weight */}
                    {log.weightKg && (
                      <span className="text-xs text-white/40">{log.weightKg} kg</span>
                    )}
                  </div>
                </div>

                {/* Exercises */}
                {log.exercises?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1.5">
                      {log.exercises.length} exercise{log.exercises.length !== 1 ? "s" : ""}
                      {log.sessionsUsed && log.sessionsUsed > 1 ? ` · ${log.sessionsUsed} sessions deducted` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {log.exercises.slice(0, 5).map((ex, i) => (
                        <span key={i} className="text-xs bg-white/[0.06] text-white/60 rounded-md px-2 py-0.5">
                          {ex.name}
                          {ex.sets && ex.reps ? ` ${ex.sets}×${ex.reps}` : ""}
                          {ex.weight ? ` @${ex.weight}kg` : ""}
                        </span>
                      ))}
                      {log.exercises.length > 5 && (
                        <span className="text-xs text-white/30">+{log.exercises.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}

                {log.notes && (
                  <p className="mt-2 text-xs text-white/50 line-clamp-2 italic">{log.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
