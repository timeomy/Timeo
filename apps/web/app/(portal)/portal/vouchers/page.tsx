"use client";

import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { Ticket, AlertCircle } from "lucide-react";

export default function MyVouchersPage() {
  const { tenantId } = useTenantId();

  const access = useQuery(api.auth.checkAccess, tenantId ? { tenantId } : "skip");
  const ready = tenantId && access?.ready;

  const vouchers = useQuery(
    api.vouchers.getMyVouchers,
    ready ? { tenantId } : "skip"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          My Vouchers
        </h1>
        <p className="text-sm text-white/50">
          View your voucher redemption history
        </p>
      </div>

      {/* Content */}
      {vouchers === undefined ? (
        <LoadingSkeleton />
      ) : vouchers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vouchers.map((redemption) => {
            const typeLabel =
              redemption.voucherType === "percentage"
                ? `${redemption.voucherValue}% off`
                : redemption.voucherType === "fixed"
                  ? `RM ${((redemption.voucherValue ?? 0) / 100).toFixed(2)} off`
                  : redemption.voucherType === "free_session"
                    ? "Free Session"
                    : "Voucher";

            const typeColor =
              redemption.voucherType === "percentage"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                : redemption.voucherType === "fixed"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/30";

            return (
              <Card
                key={redemption._id}
                className="glass border-white/[0.08]"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <Ticket className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-white">
                          {redemption.voucherCode}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            typeColor
                          )}
                        >
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                    {redemption.discountAmount !== undefined && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">
                          -RM{" "}
                          {(redemption.discountAmount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-white/40">saved</p>
                      </div>
                    )}
                  </div>

                  {/* Redemption Date */}
                  {redemption.redeemedAt && (
                    <p className="mt-3 text-xs text-white/30">
                      Redeemed{" "}
                      {new Date(redemption.redeemedAt).toLocaleDateString(
                        "en-MY",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-white/[0.06]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 bg-white/[0.06]" />
                <Skeleton className="h-5 w-20 rounded-full bg-white/[0.06]" />
              </div>
            </div>
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
      <p className="text-sm font-medium text-white/50">No vouchers yet</p>
      <p className="mt-1 text-xs text-white/30">
        Your redeemed vouchers will appear here.
      </p>
    </div>
  );
}
