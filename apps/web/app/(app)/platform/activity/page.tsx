"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Select,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@timeo/ui/web";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const PAGE_LIMIT = 100;

interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetName: string;
  targetId: string;
  ipAddress: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogsResponse {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

const ACTION_CATEGORIES = [
  { label: "All Actions", value: "all" },
  { label: "Tenant", value: "tenant" },
  { label: "User", value: "user" },
  { label: "Subscription", value: "subscription" },
  { label: "Flag", value: "flag" },
  { label: "Auth", value: "auth" },
];

function ExpandableDetails({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !details || Object.keys(details).length === 0;

  if (isEmpty) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Hide
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            View
          </>
        )}
      </button>
      {expanded && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/[0.08] bg-muted/30 p-2 text-[10px] leading-relaxed text-muted-foreground">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [actionCategory, setActionCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);

  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    ...(cursor && { cursor }),
    ...(actorSearch && { actor: actorSearch }),
    ...(actionCategory !== "all" && { category: actionCategory }),
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "platform",
      "audit-logs",
      cursor,
      actorSearch,
      actionCategory,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      api.get<AuditLogsResponse>(
        `/api/platform/audit-logs?${params.toString()}`,
      ),
    staleTime: 15_000,
  });

  const entries = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const filtered = search
    ? entries.filter(
        (e) =>
          e.action.toLowerCase().includes(search.toLowerCase()) ||
          e.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
          e.targetName?.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(nextCursor);
  };

  const handlePrev = () => {
    if (cursorHistory.length <= 1) return;
    const prev = cursorHistory[cursorHistory.length - 2] ?? null;
    setCursorHistory((h) => h.slice(0, -1));
    setCursor(prev);
  };

  const resetFilters = () => {
    setSearch("");
    setActorSearch("");
    setActionCategory("all");
    setDateFrom("");
    setDateTo("");
    setCursor(null);
    setCursorHistory([null]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="mt-1 text-muted-foreground">
          Platform-wide audit trail for compliance and debugging.
        </p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by actor email..."
                value={actorSearch}
                onChange={(e) => {
                  setActorSearch(e.target.value);
                  setCursor(null);
                  setCursorHistory([null]);
                }}
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select
              options={ACTION_CATEGORIES}
              value={actionCategory}
              onChange={(v) => {
                setActionCategory(v);
                setCursor(null);
                setCursorHistory([null]);
              }}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCursor(null);
                  setCursorHistory([null]);
                }}
                className="flex h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCursor(null);
                  setCursorHistory([null]);
                }}
                className="flex h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="To date"
              />
            </div>
          </div>
          {(actorSearch || actionCategory !== "all" || dateFrom || dateTo) && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No audit log entries found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id} className="border-white/[0.06]">
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("en-MY", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{entry.actorEmail}</p>
                        {entry.actorRole && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {entry.actorRole.replace("_", " ")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs">
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {entry.targetName || entry.targetId || "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {entry.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ExpandableDetails details={entry.details} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cursor Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} entries
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cursorHistory.length <= 1}
            onClick={handlePrev}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextCursor}
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
