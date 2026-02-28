"use client";

import { useState } from "react";
import Link from "next/link";
import { useServices } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Badge,
  Button,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { Search, Clock, Calendar, ArrowRight } from "lucide-react";

export default function ServicesPage() {
  const { activeTenantId } = useTimeoWebAuthContext();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: services, isLoading } = useServices(activeTenantId ?? "");

  const filteredServices = services?.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available services and book your appointment.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredServices?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No services found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search terms."
              : "No services are available at the moment."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* No tenant selected */}
      {!activeTenantId && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No business selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in and select a business to view available services.
          </p>
        </div>
      )}

      {/* Service Grid */}
      {filteredServices && filteredServices.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className="group flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {formatPrice(service.price, service.currency)}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {service.description}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {service.durationMinutes} min
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/services/${service.id}`} className="w-full">
                  <Button className="w-full gap-2 transition-all group-hover:gap-3">
                    Book Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
