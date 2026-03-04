"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useService, useCreateBooking, useAvailableSlots } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Button,
  Badge,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  Clock,
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const { activeTenantId, isSignedIn } = useTimeoWebAuthContext();

  const { data: service, isLoading } = useService(activeTenantId ?? "", serviceId);

  const { mutateAsync: createBooking } = useCreateBooking(activeTenantId ?? "");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: availableSlots, isLoading: slotsLoading } = useAvailableSlots(
    activeTenantId,
    serviceId,
    selectedDate || null,
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedSlot(null);
    setError(null);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      setError("Please select a date and time slot.");
      return;
    }
    if (!activeTenantId) {
      setError("No business selected. Please sign in first.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createBooking({
        serviceId,
        startTime: selectedSlot.startTime,
        notes: notes.trim() || undefined,
      });

      setBookingSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create booking."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div>
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold">Service not found</h2>
        <p className="mt-2 text-muted-foreground">
          The service you are looking for does not exist or has been removed.
        </p>
        <Link href="/services">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Button>
        </Link>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <CheckCircle2 className="h-8 w-8 text-secondary" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Booking Confirmed!</h2>
            <p className="mt-2 text-muted-foreground">
              Your booking for{" "}
              <span className="font-medium text-foreground">
                {service.name}
              </span>{" "}
              has been submitted successfully.
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {selectedSlot && (
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatSlotTime(selectedSlot.startTime)} -{" "}
                    {formatSlotTime(selectedSlot.endTime)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <Link href="/bookings">
                <Button>View My Bookings</Button>
              </Link>
              <Link href="/services">
                <Button variant="outline">Browse More Services</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Services
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Service Info */}
        <div className="space-y-6">
          {/* Image Placeholder */}
          <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted/30">
            <Calendar className="h-16 w-16 text-muted-foreground/30" />
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold">{service.name}</h1>
              <Badge
                variant="secondary"
                className="flex-shrink-0 text-base px-3 py-1"
              >
                {formatPrice(service.price, service.currency)}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{service.durationMinutes} minutes</span>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold">About this service</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          </div>
        </div>

        {/* Booking Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Book this service</CardTitle>
              <CardDescription>
                Select your preferred date and time to book an appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSignedIn && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-primary">Sign in required</p>
                  <p className="mt-1 text-muted-foreground">
                    Please{" "}
                    <Link
                      href="/sign-in"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      sign in
                    </Link>{" "}
                    to book this service.
                  </p>
                </div>
              )}

              {/* Step 1: Date */}
              <div className="space-y-2">
                <label
                  htmlFor="booking-date"
                  className="text-sm font-medium leading-none"
                >
                  1. Select a date
                </label>
                <Input
                  id="booking-date"
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={!isSignedIn}
                />
              </div>

              {/* Step 2: Time slot selection */}
              {selectedDate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    2. Pick a time
                  </label>
                  {slotsLoading ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 rounded-md" />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Loading available times...
                      </p>
                    </div>
                  ) : !availableSlots?.slots || availableSlots.slots.length === 0 ? (
                    <div className="rounded-lg border border-muted bg-muted/30 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No available times on this date. Please try another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.slots.map((slot) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime;
                        const isDisabled = slot.availableStaffCount === 0;
                        return (
                          <Button
                            key={slot.startTime}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={isDisabled}
                            className={
                              isDisabled
                                ? "opacity-40 cursor-not-allowed"
                                : isSelected
                                  ? ""
                                  : "hover:border-primary/50"
                            }
                            onClick={() =>
                              setSelectedSlot({
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                              })
                            }
                          >
                            {formatSlotTime(slot.startTime)}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="booking-notes"
                  className="text-sm font-medium leading-none"
                >
                  Notes{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="booking-notes"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Any special requests or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isSignedIn}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                onClick={handleBooking}
                disabled={!isSignedIn || isSubmitting || !selectedDate || !selectedSlot}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Book Now
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Booking Summary */}
          {selectedDate && selectedSlot && (
            <Card className="mt-4">
              <CardContent className="py-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Booking Summary
                </h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {new Date(selectedDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {formatSlotTime(selectedSlot.startTime)} -{" "}
                      {formatSlotTime(selectedSlot.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {service.durationMinutes} min
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-primary">
                      {formatPrice(service.price, service.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
