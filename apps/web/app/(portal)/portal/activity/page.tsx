"use client";

import { useMemo, useState } from "react";
import { useMyBookings, useMyCheckInHistory } from "@timeo/api-client";
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton, cn } from "@timeo/ui/web";
import { Calendar, Clock3, DoorOpen, History, SlidersHorizontal } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant-id";

type TypeFilter = "all" | "checkins" | "classes" | "bookings";
type RangeFilter = "7d" | "30d" | "90d" | "all";

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "checkins", label: "Check-ins" },
  { value: "classes", label: "Classes" },
  { value: "bookings", label: "Bookings" },
];

const rangeOptions: Array<{ value: RangeFilter; label: string }> = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
];

function getRangeStart(range: RangeFilter) {
  if (range === "all") return null;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000);
}

function formatMethod(method?: string) {
  if (!method) return "Unknown";
  if (method === "nfc") return "Card";
  return method.toUpperCase();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const { tenantId } = useTenantId();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("30d");
  const { data: checkInHistory, isLoading: checkInsLoading } = useMyCheckInHistory(tenantId, {
    page: 1,
    limit: 50,
  });
  const { data: bookings = [], isLoading: bookingsLoading } = useMyBookings(tenantId);

  if (!tenantId) {
    return null;
  }

  const rangeStart = getRangeStart(rangeFilter);
  const withinRange = (value: string) => {
    if (!rangeStart) return true;
    return new Date(value) >= rangeStart;
  };

  const checkIns = (checkInHistory?.items ?? []).filter((item) => withinRange(item.checkedInAt));

  const upcomingClasses = useMemo(() => {
    return bookings.filter(
      (booking) =>
        ["pending", "confirmed"].includes(booking.status) &&
        new Date(booking.startTime).getTime() > Date.now() &&
        withinRange(booking.startTime)
    );
  }, [bookings, rangeStart]);

  const pastClasses = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "completed" &&
        new Date(booking.startTime).getTime() <= Date.now() &&
        withinRange(booking.startTime)
    );
  }, [bookings, rangeStart]);

  const bookingHistory = useMemo(() => {
    return bookings.filter((booking) => withinRange(booking.startTime));
  }, [bookings, rangeStart]);

  const loading = checkInsLoading || bookingsLoading;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="mt-1 text-sm text-white/55">Track your check-ins, classes, and booking timeline.</p>
      </div>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4 text-white/60" />
            Filters
          </div>

          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-xs font-medium transition-colors",
                  typeFilter === option.value
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                    : "border-white/[0.12] bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeFilter(option.value)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-xs font-medium transition-colors",
                  rangeFilter === option.value
                    ? "border-sky-500/40 bg-sky-500/20 text-sky-200"
                    : "border-white/[0.12] bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {(typeFilter === "all" || typeFilter === "checkins") && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Check-in History</h2>
          <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
            <CardContent className="space-y-2 p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-14 rounded-xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : checkIns.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                  No check-ins in this period.
                </div>
              ) : (
                checkIns.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{formatDateTime(item.checkedInAt)}</p>
                      <p className="mt-1 text-xs text-white/50">Method: {formatMethod(item.method)}</p>
                    </div>
                    <Badge className="rounded-full border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                      <DoorOpen className="mr-1 h-3.5 w-3.5" />
                      Check-in
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {(typeFilter === "all" || typeFilter === "classes") && (
        <section className="space-y-3">
          <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Calendar className="h-4 w-4 text-white/65" />
                Class Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((key) => (
                    <Skeleton key={key} className="h-14 rounded-xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : upcomingClasses.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                  No upcoming classes in this range.
                </div>
              ) : (
                upcomingClasses.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">{booking.serviceName ?? "Class"}</p>
                    <p className="mt-1 text-xs text-white/55">{formatDateTime(booking.startTime)}</p>
                    <Badge className="mt-2 rounded-full border-sky-500/40 bg-sky-500/20 text-sky-300">
                      {booking.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <History className="h-4 w-4 text-white/65" />
                Past Classes Attended
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((key) => (
                    <Skeleton key={key} className="h-14 rounded-xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : pastClasses.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                  No attended classes in this period.
                </div>
              ) : (
                pastClasses.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">{booking.serviceName ?? "Class"}</p>
                    <p className="mt-1 text-xs text-white/55">{formatDateTime(booking.startTime)}</p>
                    <Badge className="mt-2 rounded-full border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                      Completed
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {(typeFilter === "all" || typeFilter === "bookings") && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Clock3 className="h-4 w-4 text-white/65" />
            Booking History
          </h2>
          <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
            <CardContent className="space-y-2 p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-14 rounded-xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : bookingHistory.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-sm text-white/60">
                  No bookings found.
                </div>
              ) : (
                bookingHistory.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{booking.serviceName ?? "Class"}</p>
                      <p className="mt-1 text-xs text-white/55">{formatDateTime(booking.startTime)}</p>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full border px-2 py-0 text-[11px]",
                        booking.status === "completed" && "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
                        ["confirmed", "pending"].includes(booking.status) &&
                          "border-sky-500/40 bg-sky-500/20 text-sky-300",
                        ["cancelled", "no_show"].includes(booking.status) &&
                          "border-red-500/40 bg-red-500/20 text-red-300"
                      )}
                    >
                      {booking.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
