"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatDate, formatTime } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  cn,
} from "@timeo/ui/web";
import {
  Calendar,
  Clock,
  Eye,
  ClipboardList,
  ArrowRight,
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

export default function BookingsPage() {
  const { activeTenantId, isSignedIn } = useTimeoWebAuthContext();

  const bookings = useQuery(
    api.bookings.listByCustomer,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const isLoading = bookings === undefined;

  const { upcoming, past } = useMemo(() => {
    if (!bookings) return { upcoming: [], past: [] };

    const now = Date.now();
    const upcoming = bookings.filter(
      (b) =>
        b.startTime > now &&
        b.status !== "cancelled" &&
        b.status !== "completed" &&
        b.status !== "no_show"
    );
    const past = bookings.filter(
      (b) =>
        b.startTime <= now ||
        b.status === "cancelled" ||
        b.status === "completed" ||
        b.status === "no_show"
    );

    return { upcoming, past };
  }, [bookings]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to view bookings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to be signed in to see your bookings.
        </p>
        <Link href="/sign-in">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage your appointments.
          </p>
        </div>
        <Link href="/services">
          <Button className="gap-2">
            <Calendar className="h-4 w-4" />
            Book New
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {isLoading ? (
            <BookingsLoadingSkeleton />
          ) : upcoming.length === 0 ? (
            <EmptyBookings
              title="No upcoming bookings"
              description="You don't have any upcoming appointments. Browse services to book one."
              showCTA
            />
          ) : (
            <BookingsTable bookings={upcoming} />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {isLoading ? (
            <BookingsLoadingSkeleton />
          ) : past.length === 0 ? (
            <EmptyBookings
              title="No past bookings"
              description="Your past bookings will appear here."
            />
          ) : (
            <BookingsTable bookings={past} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingsTable({
  bookings,
}: {
  bookings: Array<{
    _id: string;
    serviceName: string;
    startTime: number;
    endTime: number;
    status: string;
    staffName?: string;
  }>;
}) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell className="font-medium">
                  {booking.serviceName}
                </TableCell>
                <TableCell>{formatDate(booking.startTime)}</TableCell>
                <TableCell>{formatTime(booking.startTime)}</TableCell>
                <TableCell>{booking.staffName ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/bookings/${booking._id}`}>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => (
          <Link key={booking._id} href={`/bookings/${booking._id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{booking.serviceName}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(booking.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(booking.startTime)}
                      </span>
                    </div>
                    {booking.staffName && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        with {booking.staffName}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function BookingsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyBookings({
  title,
  description,
  showCTA,
}: {
  title: string;
  description: string;
  showCTA?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {description}
      </p>
      {showCTA && (
        <Link href="/services">
          <Button className="mt-4 gap-2">
            Browse Services
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
