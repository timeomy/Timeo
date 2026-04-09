"use client";

import { useState } from "react";
import {
  useTemplateMigrationExecute,
  useTemplateMigrationPreview,
  type TemplateMigrationReport,
} from "@timeo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@timeo/ui/web";
import { AlertTriangle, Play, RefreshCw } from "lucide-react";

const migrationAllowlist = [
  "tenant_template_assignments",
  "tenant_ui_overrides",
];

function statusBadge(status: string) {
  if (status === "assign") {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }

  if (status === "skip_missing_template") {
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  }

  return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
}

export default function TemplateMigrationsPage() {
  const preview = useTemplateMigrationPreview();
  const execute = useTemplateMigrationExecute();
  const [report, setReport] = useState<TemplateMigrationReport | null>(null);

  async function handlePreview() {
    try {
      const nextReport = await preview.mutateAsync(migrationAllowlist);
      setReport(nextReport);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to preview migration");
    }
  }

  async function handleExecute() {
    const ok = confirm(
      "Execute template migration now? This only writes tenant_template_assignments and tenant_ui_overrides.",
    );
    if (!ok) {
      return;
    }

    try {
      const nextReport = await execute.mutateAsync(migrationAllowlist);
      setReport(nextReport);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute migration");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Template Migrations</h1>
        <p className="mt-1 text-muted-foreground">
          Preview and execute assignment migration for existing tenants.
        </p>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Safe Write Scope
          </CardTitle>
          <CardDescription>
            Migration writes are restricted to metadata tables only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {migrationAllowlist.map((tableName) => (
              <Badge key={tableName} variant="outline">
                {tableName}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePreview} disabled={preview.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {preview.isPending ? "Previewing..." : "Run Preview"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecute}
              disabled={execute.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {execute.isPending ? "Executing..." : "Execute Migration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle>Migration Report</CardTitle>
            <CardDescription>
              Mode: {report.mode} · parity check: {report.businessCounts.parityOk ? "OK" : "FAILED"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-white/[0.08] p-3">
                <p className="text-xs text-muted-foreground">Total Tenants</p>
                <p className="text-xl font-semibold">{report.summary.totalTenants}</p>
              </div>
              <div className="rounded border border-white/[0.08] p-3">
                <p className="text-xs text-muted-foreground">Ready To Assign</p>
                <p className="text-xl font-semibold">{report.summary.readyToAssign}</p>
              </div>
              <div className="rounded border border-white/[0.08] p-3">
                <p className="text-xs text-muted-foreground">Skipped Unknown Industry</p>
                <p className="text-xl font-semibold">
                  {report.summary.skippedUnknownIndustry}
                </p>
              </div>
              <div className="rounded border border-white/[0.08] p-3">
                <p className="text-xs text-muted-foreground">Skipped Missing Template</p>
                <p className="text-xl font-semibold">
                  {report.summary.skippedMissingTemplate}
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Raw Industry</TableHead>
                  <TableHead>Normalized</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.plan.map((row) => (
                  <TableRow key={row.tenantId} className="border-white/[0.06]">
                    <TableCell>{row.tenantName}</TableCell>
                    <TableCell>{row.rawIndustry ?? "—"}</TableCell>
                    <TableCell>{row.normalizedIndustry ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadge(row.status)}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
