"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMyBookings } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatDate, formatTime, formatPrice, formatRelativeTime } from "@timeo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  Ban,
} from "lucide-react";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "pending":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
    case "no_show":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No Show";
    default:
      return status;
  }
}

function getEventIcon(type: string) {
  switch (type) {
    case "created":
      return <Circle className="h-4 w-4 text-primary" />;
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4 text-secondary" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "no_show":
      return <Ban className="h-4 w-4 text-destructive" />;
    case "rescheduled":
      return <Calendar className="h-4 w-4 text-primary" />;
    case "note_added":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getEventLabel(type: string): string {
  switch (type) {
    case "created":
      return "Booking created";
    case "confirmed":
      return "Booking confirmed";
    case "completed":
      return "Booking completed";
    case "cancelled":
      return "Booking cancelled";
    case "no_show":
      return "Marked as no-show";
    case "rescheduled":
      return "Booking rescheduled";
    case "note_added":
      return "Note added";
    default:
      return type;
  }
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const { activeTenantId } = useTimeoWebAuthContext();

  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: bookings, isLoading } = useMyBookings(activeTenantId ?? "");

  const booking = bookings?.find((b) => b.id === bookingId);

  const canCancel =
    booking?.status === "pending" || booking?.status === "confirmed";

  const handleCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      // Cancel mutation would be called here when available in api-client
      setShowCancelConfirm(false);
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold">Booking not found</h2>
        <p className="mt-2 text-muted-foreground">
          The booking you are looking for does not exist.
        </p>
        <Link href="/bookings">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/bookings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{booking.serviceName}</h1>
          <p className="mt-1 text-muted-foreground">
            Booking #{booking.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <Badge
          variant={getStatusVariant(booking.status)}
          className="w-fit px-3 py-1 text-sm"
        >
          {getStatusLabel(booking.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Date
                    </p>
                    <p className="font-medium">
                      {new Date(booking.startTime).toLocaleDateString(
                        undefined,
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Time
                    </p>
                    <p className="font-medium">
                      {formatTime(booking.startTime)} -{" "}
                      {formatTime(booking.endTime)}
                    </p>
                    {booking.serviceDuration && (
                      <p className="text-sm text-muted-foreground">
                        {booking.serviceDuration} minutes
                      </p>
                    )}
                  </div>
                </div>

                {booking.staffName && (
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Staff
                      </p>
                      <p className="font-medium">{booking.staffName}</p>
                    </div>
                  </div>
                )}

                {booking.servicePrice !== undefined && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Price
                      </p>
                      <p className="font-medium text-primary">
                        {formatPrice(booking.servicePrice)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {booking.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">
                      {booking.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>

            {canCancel && (
              <CardFooter className="border-t pt-6">
                {showCancelConfirm ? (
                  <div className="flex w-full flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">
                          Cancel this booking?
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="gap-2"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Yes, Cancel Booking"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={isCancelling}
                      >
                        Keep Booking
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Booking
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
