"use client";

import { useState, useMemo } from "react";
import {
  useBookings,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking,
  useMarkNoShow,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@timeo/ui/web";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  UserX,
  AlertCircle,
} from "lucide-react";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "secondary" | "default" | "outline" | "destructive"; className?: string }
> = {
  pending: { label: "Pending", variant: "secondary", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmed", variant: "default", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  completed: { label: "Completed", variant: "outline", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", variant: "destructive", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  no_show: { label: "No Show", variant: "secondary", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function BookingsPage() {
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState("all");

  const { data: bookings, isLoading } = useBookings(tenantId ?? "");

  const { mutateAsync: confirmBooking } = useConfirmBooking(tenantId ?? "");
  const { mutateAsync: cancelBooking } = useCancelBooking(tenantId ?? "");
  const { mutateAsync: completeBooking } = useCompleteBooking(tenantId ?? "");
  const { mutateAsync: markNoShow } = useMarkNoShow(tenantId ?? "");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () =>
      bookings?.filter((b) =>
        activeTab === "all" ? true : b.status === activeTab,
      ) ?? [],
    [bookings, activeTab],
  );

  const counts = useMemo(
    () => ({
      all: bookings?.length ?? 0,
      pending: bookings?.filter((b) => b.status === "pending").length ?? 0,
      confirmed: bookings?.filter((b) => b.status === "confirmed").length ?? 0,
      completed: bookings?.filter((b) => b.status === "completed").length ?? 0,
      cancelled: bookings?.filter((b) => b.status === "cancelled").length ?? 0,
    }),
    [bookings],
  );

  async function handleAction(
    action: "confirm" | "cancel" | "complete" | "no_show",
    bookingId: string,
  ) {
    if (!tenantId) return;
    const key = `${action}-${bookingId}`;
    setLoadingAction(key);
    try {
      switch (action) {
        case "confirm":
          await confirmBooking(bookingId);
          break;
        case "cancel":
          await cancelBooking({ bookingId });
          break;
        case "complete":
          await completeBooking(bookingId);
          break;
        case "no_show":
          await markNoShow(bookingId);
          break;
      }
    } catch (err) {
      console.error(`Failed to ${action} booking:`, err);
    } finally {
      setLoadingAction(null);
    }
  }

  function isActionLoading(action: string, id: string) {
    return loadingAction === `${action}-${id}`;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bookings
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${bookings?.length ?? 0} total bookings`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <Calendar className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-white/70">
            {counts.pending} pending
          </span>
        </div>
      </div>

      {/* Filter Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-400"
            >
              {tab.label}
              {counts[tab.value as keyof typeof counts] > 0 && (
                <span className="ml-1.5 text-xs text-white/40">
                  {counts[tab.value as keyof typeof counts]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredBookings.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Customer</TableHead>
                      <TableHead className="text-white/50">Service</TableHead>
                      <TableHead className="text-white/50">Date & Time</TableHead>
                      <TableHead className="text-white/50">Staff</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                      <TableHead className="text-right text-white/50">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="border-white/[0.06] hover:bg-white/[0.02]"
                      >
                        <TableCell className="font-medium text-white">
                          {booking.customerName ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {booking.serviceName ?? "—"}
                        </TableCell>
                        <TableCell className="text-white/70">
                          <div className="flex flex-col">
                            <span>{formatDate(booking.startTime)}</span>
                            <span className="text-xs text-white/40">
                              {formatTime(booking.startTime)} –{" "}
                              {formatTime(booking.endTime)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white/70">
                          {booking.staffName ?? "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status as BookingStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  disabled={isActionLoading("confirm", booking.id)}
                                  onClick={() =>
                                    handleAction("confirm", booking.id)
                                  }
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  disabled={isActionLoading("cancel", booking.id)}
                                  onClick={() =>
                                    handleAction("cancel", booking.id)
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  disabled={isActionLoading("complete", booking.id)}
                                  onClick={() =>
                                    handleAction("complete", booking.id)
                                  }
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  disabled={isActionLoading("cancel", booking.id)}
                                  onClick={() =>
                                    handleAction("cancel", booking.id)
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-gray-400 hover:bg-gray-500/10 hover:text-gray-300"
                                  disabled={isActionLoading("no_show", booking.id)}
                                  onClick={() =>
                                    handleAction("no_show", booking.id)
                                  }
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  No-Show
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant={config.variant} className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-4 w-32 bg-white/[0.06]" />
          <Skeleton className="h-4 w-28 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-7 w-20 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No bookings found</p>
      <p className="text-xs text-white/30 mt-1">
        {tab === "all"
          ? "Bookings will appear here when customers make reservations."
          : `No ${tab} bookings at the moment.`}
      </p>
    </div>
  );
}
