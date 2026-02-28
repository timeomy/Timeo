"use client";

import { useState } from "react";
import { useMyBookings } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  cn,
} from "@timeo/ui/web";
import { Calendar, Clock, User, AlertCircle } from "lucide-react";

type BookingStatus = "all" | "upcoming" | "completed" | "cancelled";

export default function MyBookingsPage() {
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState<BookingStatus>("all");

  const { data: bookings, isLoading } = useMyBookings(tenantId);

  const now = Date.now();

  const filteredBookings = bookings?.filter((b) => {
    switch (activeTab) {
      case "upcoming":
        return (
          (b.status === "pending" || b.status === "confirmed") &&
          new Date(b.startTime).getTime() > now
        );
      case "completed":
        return b.status === "completed";
      case "cancelled":
        return b.status === "cancelled";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          My Bookings
        </h1>
        <p className="text-sm text-white/50">
          View and manage your appointments
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BookingStatus)}
      >
        <TabsList className="bg-white/[0.04]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <LoadingSkeleton />
          ) : filteredBookings && filteredBookings.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-3">
              {filteredBookings?.map((booking) => (
                <Card
                  key={booking.id}
                  className="glass border-white/[0.08]"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-white/[0.04] p-2">
                          <Calendar className="h-5 w-5 text-white/50" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-white">
                            {booking.serviceName}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(booking.startTime).toLocaleDateString(
                                "en-MY",
                                {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                              {" at "}
                              {new Date(booking.startTime).toLocaleTimeString(
                                "en-MY",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            {booking.serviceDuration && (
                              <span>{booking.serviceDuration} min</span>
                            )}
                            {booking.staffName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {booking.staffName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
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

  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="glass border-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-white/[0.06]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-white/[0.06]" />
                <Skeleton className="h-3 w-56 bg-white/[0.06]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: BookingStatus }) {
  const messages: Record<BookingStatus, { title: string; desc: string }> = {
    all: {
      title: "No bookings yet",
      desc: "Your bookings will appear here once you make an appointment.",
    },
    upcoming: {
      title: "No upcoming bookings",
      desc: "You don't have any upcoming appointments scheduled.",
    },
    completed: {
      title: "No completed bookings",
      desc: "Your completed sessions will show up here.",
    },
    cancelled: {
      title: "No cancelled bookings",
      desc: "You haven't cancelled any bookings.",
    },
  };

  const msg = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 rounded-full bg-white/[0.04] p-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">{msg.title}</p>
      <p className="mt-1 text-xs text-white/30">{msg.desc}</p>
    </div>
  );
}
