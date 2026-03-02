"use client";

import { useState } from "react";
import { usePlatformAuditLog } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Input,
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
} from "@timeo/ui/web";
import { ScrollText, Search } from "lucide-react";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const ACTION_BADGE_VARIANTS: Record<string, string> = {
  created: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  updated: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  deleted: "bg-red-500/20 text-red-400 border-red-500/30",
  set: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function getActionVariant(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("create")) return ACTION_BADGE_VARIANTS.created;
  if (lower.includes("update")) return ACTION_BADGE_VARIANTS.updated;
  if (lower.includes("delete") || lower.includes("suspend"))
    return ACTION_BADGE_VARIANTS.deleted;
  if (lower.includes("set") || lower.includes("flag"))
    return ACTION_BADGE_VARIANTS.set;
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

const ACTION_FILTER_OPTIONS = [
  { label: "All Actions", value: "" },
  { label: "tenant.create", value: "tenant.create" },
  { label: "tenant.update", value: "tenant.update" },
  { label: "config.update", value: "config.update" },
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: logsData, isLoading } = usePlatformAuditLog({
    action: actionFilter || undefined,
    limit: 50,
  });
  const logs = logsData?.items ?? [];

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(lower) ||
      log.actorId.toLowerCase().includes(lower) ||
      log.resourceType.toLowerCase().includes(lower) ||
      (log.resourceId ?? "").toLowerCase().includes(lower)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-muted-foreground">
          {isLoading
            ? "Loading audit logs..."
            : `${logsData?.total ?? 0} log entr${(logsData?.total ?? 0) !== 1 ? "ies" : "y"}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by actor, action, resource..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="pl-9"
          />
        </div>
        <Select
          options={ACTION_FILTER_OPTIONS}
          value={actionFilter}
          onChange={(value: string) => setActionFilter(value)}
          placeholder="Filter by action"
          className="w-full sm:w-56"
        />
      </div>

      {/* Table */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ScrollText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {search || actionFilter
                  ? "No logs match your filters"
                  : "No audit logs yet"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search || actionFilter
                  ? "Try adjusting your search or filter."
                  : "System activity will be recorded here."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Tenant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="border-white/[0.06]">
                    <TableCell>
                      <span
                        className="text-sm text-muted-foreground"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {timeAgo(new Date(log.createdAt).getTime())}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs">{log.actorId}</p>
                        <p className="text-xs text-muted-foreground">{log.actorRole}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getActionVariant(log.action)}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {" "}{log.resourceId}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.tenantId ?? "Platform"}
                      </span>
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
