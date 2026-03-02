"use client";

import { useState } from "react";
import { useSeedFeatureFlags } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@timeo/ui/web";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Shield,
  CheckCircle,
} from "lucide-react";

function ActionCard({
  title,
  description,
  icon: Icon,
  action,
  actionLabel,
  loading,
  variant = "default",
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  actionLabel: string;
  loading?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            size="sm"
            variant={variant === "danger" ? "outline" : "outline"}
            onClick={action}
            disabled={loading}
            className={variant === "danger" ? "text-red-400 hover:text-red-300" : ""}
          >
            {loading ? "Running..." : actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataPage() {
  const seedFlags = useSeedFeatureFlags();
  const [seedComplete, setSeedComplete] = useState(false);

  async function handleSeedFlags() {
    await seedFlags.mutateAsync();
    setSeedComplete(true);
    setTimeout(() => setSeedComplete(false), 3000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="mt-1 text-muted-foreground">
          Database operations, backups, and data management tools.
        </p>
      </div>

      {/* Seed & Setup */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Seed Data
          </CardTitle>
          <CardDescription>
            Populate the database with initial data and defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4">
            <div>
              <p className="text-sm font-medium">Seed Feature Flags</p>
              <p className="text-xs text-muted-foreground">
                Create default feature flags for the platform.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {seedComplete && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Done
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedFlags}
                disabled={seedFlags.isPending}
              >
                {seedFlags.isPending ? "Seeding..." : "Seed Flags"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Export */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup & Export
          </CardTitle>
          <CardDescription>
            Create backups and export data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionCard
            title="Database Backup"
            description="Create a full database backup. Backups are stored on the server."
            icon={Database}
            action={() => {}}
            actionLabel="Trigger Backup"
          />
          <ActionCard
            title="Export Tenant Data"
            description="Export all data for a specific tenant (GDPR compliance)."
            icon={Download}
            action={() => {}}
            actionLabel="Export"
          />
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Import
          </CardTitle>
          <CardDescription>
            Bulk import data from CSV files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionCard
            title="Import Tenants from CSV"
            description="Bulk import tenant records from a CSV file."
            icon={Upload}
            action={() => {}}
            actionLabel="Import"
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="glass border-white/[0.08] border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Shield className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Destructive operations. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionCard
            title="Clear Redis Cache"
            description="Clear all cached data from Redis. This may cause a temporary slowdown."
            icon={RefreshCw}
            action={() => {}}
            actionLabel="Clear Cache"
            variant="danger"
          />
          <ActionCard
            title="Purge Old Audit Logs"
            description="Delete audit log entries older than 90 days."
            icon={Database}
            action={() => {}}
            actionLabel="Purge"
            variant="danger"
          />
        </CardContent>
      </Card>
    </div>
  );
}
