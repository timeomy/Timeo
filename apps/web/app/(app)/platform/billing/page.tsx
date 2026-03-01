"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@timeo/ui/web";
import { KpiCard } from "@/components/platform/kpi-card";
import {
  DollarSign,
  TrendingDown,
  Users,
  CreditCard,
  ArrowRight,
} from "lucide-react";

interface BillingStats {
  mrr: number;
  arr: number;
  churnRate30d: number;
  avgRevenuePerTenant: number;
}

interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  amountCents: number;
  status: string;
  startDate: string;
  nextRenewal: string;
}

interface SubscriptionsResponse {
  items: Subscription[];
  total: number;
}

const planOptions = [
  { label: "All Plans", value: "all" },
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Past Due", value: "past_due" },
  { label: "Cancelled", value: "cancelled" },
];

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  past_due: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function formatMrr(cents: number) {
  return `RM ${(cents / 100).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
  })}`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);
  const [changePlanTarget, setChangePlanTarget] = useState<Subscription | null>(
    null,
  );
  const [newPlan, setNewPlan] = useState("starter");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform", "billing", "stats"],
    queryFn: () => api.get<BillingStats>("/api/platform/stats"),
    staleTime: 60_000,
  });

  const subsParams = new URLSearchParams({
    ...(planFilter !== "all" && { plan: planFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });

  const { data, isLoading: subsLoading } = useQuery({
    queryKey: ["platform", "subscriptions", planFilter, statusFilter],
    queryFn: () =>
      api.get<SubscriptionsResponse>(
        `/api/platform/subscriptions?${subsParams.toString()}`,
      ),
    staleTime: 30_000,
  });

  const subscriptions = data?.items ?? [];

  const { mutateAsync: cancelSubscription, isPending: cancelling } =
    useMutation({
      mutationFn: (id: string) =>
        api.delete(`/api/platform/subscriptions/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["platform", "subscriptions"] });
        setCancelTarget(null);
      },
    });

  const { mutateAsync: changePlan, isPending: changingPlan } = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.patch(`/api/platform/subscriptions/${id}`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "subscriptions"] });
      setChangePlanTarget(null);
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Subscription overview and revenue metrics.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="MRR"
          value={statsLoading ? "" : formatMrr(stats?.mrr ?? 0)}
          icon={DollarSign}
          loading={statsLoading}
          index={0}
        />
        <KpiCard
          label="ARR"
          value={statsLoading ? "" : formatMrr(stats?.arr ?? 0)}
          icon={CreditCard}
          loading={statsLoading}
          index={1}
        />
        <KpiCard
          label="Churn Rate (30d)"
          value={statsLoading ? "" : `${(stats?.churnRate30d ?? 0).toFixed(1)}%`}
          icon={TrendingDown}
          loading={statsLoading}
          index={2}
        />
        <KpiCard
          label="Avg Revenue / Tenant"
          value={
            statsLoading
              ? ""
              : formatMrr(stats?.avgRevenuePerTenant ?? 0)
          }
          icon={Users}
          loading={statsLoading}
          index={3}
        />
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              options={planOptions}
              value={planFilter}
              onChange={setPlanFilter}
              className="sm:w-44"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="sm:w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">
            Subscriptions ({data?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {subsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No subscriptions found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount/mo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Start</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Next Renewal
                  </TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id} className="border-white/[0.06]">
                    <TableCell>
                      <Link
                        href={`/platform/tenants/${sub.tenantId}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {sub.tenantName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={planColors[sub.plan] ?? ""}
                      >
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMrr(sub.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[sub.status] ?? ""}
                      >
                        {sub.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(sub.startDate)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {sub.nextRenewal ? formatDate(sub.nextRenewal) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/platform/tenants/${sub.tenantId}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View tenant"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setChangePlanTarget(sub);
                            setNewPlan(sub.plan);
                          }}
                        >
                          Change
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setCancelTarget(sub)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Cancel the subscription for{" "}
              <strong>{cancelTarget?.tenantName}</strong>? Their tenant will
              revert to the free plan at the end of the billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={() =>
                cancelTarget && cancelSubscription(cancelTarget.id)
              }
            >
              {cancelling ? "Cancelling..." : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog
        open={!!changePlanTarget}
        onOpenChange={(open) => !open && setChangePlanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Change the subscription plan for{" "}
              <strong>{changePlanTarget?.tenantName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              label="New Plan"
              options={planOptions.filter((o) => o.value !== "all")}
              value={newPlan}
              onChange={setNewPlan}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setChangePlanTarget(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={changingPlan || newPlan === changePlanTarget?.plan}
              onClick={() =>
                changePlanTarget &&
                changePlan({ id: changePlanTarget.id, plan: newPlan })
              }
            >
              {changingPlan ? "Saving..." : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
