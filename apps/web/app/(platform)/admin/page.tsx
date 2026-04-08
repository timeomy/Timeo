"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePlatformTenants } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@timeo/ui/web";
import { Building2, DollarSign, Users } from "lucide-react";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function statusBadgeClass(status: string) {
  if (status === "active" || status === "trial") {
    return "border-emerald-500/30 bg-emerald-500/20 text-emerald-300";
  }
  return "border-red-500/30 bg-red-500/20 text-red-300";
}

export default function AdminHomePage() {
  const router = useRouter();
  const { data: tenants, isLoading } = usePlatformTenants();

  const totals = useMemo(() => {
    const allTenants = tenants ?? [];
    return {
      tenantCount: allTenants.length,
      members: allTenants.reduce((total, tenant) => total + (tenant.memberCount ?? 0), 0),
      mrr: allTenants.reduce((total, tenant) => total + (tenant.mrr ?? 0), 0),
    };
  }, [tenants]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Admin Home</h1>
        <p className="mt-1 text-muted-foreground">
          All tenants, all businesses, one command center.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tenants</p>
              <p className="text-xl font-semibold">{totals.tenantCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-xl font-semibold">{totals.members}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/[0.08]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-xl font-semibold">{formatMoney(totals.mrr)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08]">
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tenants ?? []).map((tenant) => {
                  const industry = (tenant.settings?.industry as string | undefined) ?? "—";
                  return (
                    <TableRow
                      key={tenant.id}
                      className="cursor-pointer border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                    >
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">@{tenant.slug}</TableCell>
                      <TableCell>{industry}</TableCell>
                      <TableCell className="capitalize">{tenant.plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(tenant.status)}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tenant.memberCount ?? 0}</TableCell>
                      <TableCell>{formatMoney(tenant.mrr ?? 0)}</TableCell>
                      <TableCell>
                        {new Date(tenant.createdAt).toLocaleDateString("en-MY")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
