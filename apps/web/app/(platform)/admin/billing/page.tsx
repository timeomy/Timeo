"use client";

import { useState } from "react";
import {
  usePlatformPlans,
  usePlatformAnalyticsOverview,
  usePlatformTenants,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from "@timeo/ui/web";
import { CreditCard, DollarSign, Building2, Plus } from "lucide-react";

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="glass border-white/[0.08]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-glow">{value}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const { data: overview, isLoading: overviewLoading } = usePlatformAnalyticsOverview();
  const { data: plans, isLoading: plansLoading } = usePlatformPlans();
  const { data: tenants, isLoading: tenantsLoading } = usePlatformTenants();
  const [showCreate, setShowCreate] = useState(false);

  const activePlans = plans?.filter((p) => p.active) ?? [];
  const totalTenants = overview?.totalTenants ?? tenants?.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="mt-1 text-muted-foreground">
            Manage subscription plans and view revenue metrics.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Tenants"
          value={String(totalTenants)}
          icon={Building2}
          loading={overviewLoading || tenantsLoading}
        />
        <MetricCard
          title="Active Plans"
          value={String(activePlans.length)}
          icon={CreditCard}
          loading={plansLoading}
        />
        <MetricCard
          title="Total Users"
          value={String(overview?.totalUsers ?? 0)}
          icon={DollarSign}
          loading={overviewLoading}
        />
      </div>

      {/* Plans Table */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg">Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {plansLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No plans configured</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create subscription plans that tenants can subscribe to.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} className="border-white/[0.06]">
                    <TableCell>
                      <p className="text-sm font-medium">{plan.name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        {plan.slug}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        RM {(plan.priceCents / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{plan.interval}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {plan.features.length} feature{plan.features.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          plan.active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }
                      >
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog (placeholder) */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Plan creation form will be available once the API is connected.
            </p>
            <Input placeholder="Plan name" disabled />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
