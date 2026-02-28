"use client";

import { useSessionCredits } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { CreditCard, AlertCircle } from "lucide-react";

export default function MyPackagesPage() {
  const { tenantId } = useTenantId();

  const { data: credits, isLoading } = useSessionCredits(tenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          My Packages
        </h1>
        <p className="text-sm text-white/50">
          Track your session credits and packages
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !credits || credits.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {credits.map((credit) => {
            const remaining = credit.remaining;
            const total = credit.totalSessions;
            const used = credit.usedSessions;
            const progressPercent =
              total > 0 ? Math.round((used / total) * 100) : 0;
            const isExpired =
              credit.expiresAt !== undefined &&
              credit.expiresAt !== null &&
              new Date(credit.expiresAt).getTime() < Date.now();
            const isFullyUsed = remaining <= 0;

            return (
              <Card
                key={credit.id}
                className={cn(
                  "glass border-white/[0.08]",
                  (isExpired || isFullyUsed) && "opacity-60"
                )}
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-2">
                        <CreditCard className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {credit.packageName}
                        </p>
                        {isExpired ? (
                          <span className="text-xs text-red-400">Expired</span>
                        ) : isFullyUsed ? (
                          <span className="text-xs text-white/40">
                            Fully used
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {remaining}
                      </p>
                      <p className="text-xs text-white/40">remaining</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/40">
                      <span>{used} used</span>
                      <span>{total} total</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          progressPercent >= 100
                            ? "bg-red-500/60"
                            : progressPercent >= 75
                              ? "bg-yellow-500/60"
                              : "bg-emerald-500/60"
                        )}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Expiry Date */}
                  {credit.expiresAt && (
                    <p className="mt-3 text-xs text-white/30">
                      {isExpired ? "Expired" : "Expires"}{" "}
                      {new Date(credit.expiresAt).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}

                  {/* Purchase Date */}
                  {credit.purchasedAt && (
                    <p className="mt-1 text-xs text-white/20">
                      Purchased{" "}
                      {new Date(credit.purchasedAt).toLocaleDateString(
                        "en-MY",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="glass border-white/[0.08]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-white/[0.06]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                <Skeleton className="h-3 w-16 bg-white/[0.06]" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full bg-white/[0.06]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 rounded-full bg-white/[0.04] p-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No packages yet</p>
      <p className="mt-1 text-xs text-white/30">
        Your session packages and credits will appear here once purchased.
      </p>
    </div>
  );
}
