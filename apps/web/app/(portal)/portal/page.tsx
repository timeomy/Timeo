"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Calendar,
  CreditCard,
  Ticket,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function PortalHomePage() {
  const { user } = useTimeoWebAuthContext();
  const { tenantId, tenant } = useTenantId();

  // Wait for user + membership to exist before querying tenant-scoped data
  const access = useQuery(
    api.auth.checkAccess,
    tenantId ? { tenantId } : "skip"
  );
  const ready = tenantId && access?.ready;

  const bookings = useQuery(
    api.bookings.listByCustomer,
    ready ? { tenantId } : "skip"
  );

  const creditBalance = useQuery(
    api.sessionCredits.getBalance,
    ready ? { tenantId } : "skip"
  );

  const vouchers = useQuery(
    api.vouchers.getMyVouchers,
    ready ? { tenantId } : "skip"
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Count upcoming bookings (status is pending or confirmed, startTime in the future)
  const now = Date.now();
  const upcomingCount =
    bookings?.filter(
      (b) =>
        (b.status === "pending" || b.status === "confirmed") &&
        b.startTime > now
    ).length ?? 0;

  const activeVoucherCount = vouchers?.length ?? 0;

  const isLoading =
    bookings === undefined ||
    creditBalance === undefined ||
    vouchers === undefined;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {tenant?.name
            ? `Your ${tenant.name} member portal`
            : "Your member portal"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Upcoming Bookings */}
        <Card className="glass border-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 bg-white/[0.06]" />
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {upcomingCount}
                  </p>
                )}
                <p className="text-xs text-white/50">Upcoming Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Credits */}
        <Card className="glass border-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 bg-white/[0.06]" />
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {creditBalance?.totalRemaining ?? 0}
                  </p>
                )}
                <p className="text-xs text-white/50">Session Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Vouchers */}
        <Card className="glass border-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Ticket className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 bg-white/[0.06]" />
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {activeVoucherCount}
                  </p>
                )}
                <p className="text-xs text-white/50">Voucher Redemptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/portal/bookings">
            <Card className="glass border-white/[0.08] transition-colors hover:border-white/[0.15] hover:bg-white/[0.04]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">My Bookings</p>
                  <p className="text-xs text-white/50">
                    View and manage your appointments
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/qr-code">
            <Card className="glass border-white/[0.08] transition-colors hover:border-white/[0.15] hover:bg-white/[0.04]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <QrCode className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">View QR Code</p>
                  <p className="text-xs text-white/50">
                    Show your check-in QR code
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/packages">
            <Card className="glass border-white/[0.08] transition-colors hover:border-white/[0.15] hover:bg-white/[0.04]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <Sparkles className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">My Packages</p>
                  <p className="text-xs text-white/50">
                    Track your session credits
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Bookings Preview */}
      {bookings && bookings.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Bookings
            </h2>
            <Link
              href="/portal/bookings"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {bookings.slice(0, 3).map((booking) => (
              <Card
                key={booking._id}
                className="glass border-white/[0.08]"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/[0.04] p-2">
                      <Calendar className="h-4 w-4 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {booking.serviceName}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(booking.startTime).toLocaleDateString(
                          "en-MY",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                        {booking.staffName && ` with ${booking.staffName}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
    no_show: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"
      )}
    >
      {status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
