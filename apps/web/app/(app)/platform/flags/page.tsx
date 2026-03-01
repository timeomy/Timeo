"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlatformFlags, useUpdatePlatformFlag } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
} from "@timeo/ui/web";
import { Flag, ArrowRight } from "lucide-react";

export default function FeatureFlagsPage() {
  const { data: flags, isLoading } = usePlatformFlags();
  const { mutateAsync: updateFlag } = useUpdatePlatformFlag();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const handleToggle = async (key: string, current: boolean) => {
    setTogglingKey(key);
    try {
      await updateFlag({ key, enabled: !current });
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-muted-foreground">
          Manage runtime feature toggles for the platform and individual
          tenants.
        </p>
      </div>

      {/* Flags Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !flags || flags.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Flag className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                No feature flags configured.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Key</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead>Global</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Last Modified
                  </TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.key} className="border-white/[0.06]">
                    <TableCell>
                      <span className="rounded bg-muted/40 px-2 py-1 font-mono text-xs">
                        {flag.key}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {flag.description || "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(flag.key, flag.enabled)}
                        disabled={togglingKey === flag.key}
                        className="flex items-center gap-2"
                        aria-label={`Toggle ${flag.key}`}
                      >
                        <div
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            flag.enabled
                              ? "bg-emerald-500"
                              : "bg-white/20"
                          } ${togglingKey === flag.key ? "opacity-50" : ""}`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              flag.enabled ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            flag.enabled
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs"
                          }
                        >
                          {flag.enabled ? "On" : "Off"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {new Date(flag.updatedAt).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/platform/flags/${encodeURIComponent(flag.key)}`}>
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
    </div>
  );
}
