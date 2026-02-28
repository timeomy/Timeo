"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useTenantBySlug,
  useServices,
} from "@timeo/api-client";
import { formatPrice } from "@timeo/shared";
import { Skeleton } from "@timeo/ui/web";
import {
  Dumbbell,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Star,
  Users,
  Zap,
  Package,
} from "lucide-react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TenantLandingPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const { data: tenant, isLoading: tenantLoading } = useTenantBySlug(tenantSlug);

  const { data: services } = useServices(tenant?.id ?? "");

  // Loading state
  if (tenantLoading) {
    return <LandingPageSkeleton />;
  }

  // Not found
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Business not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find a business with the URL &ldquo;{tenantSlug}
          &rdquo;.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Go Home
        </Link>
      </div>
    );
  }

  const businessName = (tenant.branding?.businessName as string | undefined) || tenant.name;

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 mesh-gradient" />
        <div className="absolute inset-0 -z-10 grid-pattern" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {tenant.branding?.logoUrl && (
              <img
                src={tenant.branding.logoUrl}
                alt={businessName}
                className="mx-auto mb-8 h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10"
              />
            )}
            {!tenant.branding?.logoUrl && (
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary glow-yellow-sm">
                <Dumbbell className="h-10 w-10 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent text-glow">
                {businessName}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Transform your fitness journey with expert coaching, world-class
              facilities, and a supportive community.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#services"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 glow-yellow-sm sm:w-auto"
              >
                Book a Session
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#memberships"
                className="glass-button inline-flex h-12 w-full items-center justify-center gap-2 text-base font-semibold text-foreground sm:w-auto"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ─── Services Section ──────────────────────────────────────── */}
      {services && services.length > 0 && (
        <section id="services" className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="glass-button mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                What we offer
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Our Services
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Expert-led sessions tailored to your goals.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div key={service.id} className="glass-card group p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {service.durationMinutes} min
                    </span>
                    <span className="font-semibold text-primary">
                      {formatPrice(service.price, service.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>
      )}

      {/* ─── Contact / CTA Section ─────────────────────────────────── */}
      <section id="contact" className="relative py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 mesh-gradient" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass mx-auto max-w-2xl p-10 text-center sm:p-14">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-yellow-sm">
              <Zap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start your journey?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Contact us today to book your first session or sign up for a
              membership.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Kuala Lumpur, Malaysia
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +60 12-345 6789
              </span>
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                hello@{tenantSlug}.com
              </span>
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 glow-yellow-sm sm:w-auto"
              >
                Join Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#services"
                className="glass-button inline-flex h-12 w-full items-center justify-center gap-2 text-base font-semibold text-foreground sm:w-auto"
              >
                Browse Services
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LandingPageSkeleton() {
  return (
    <div className="-mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* Hero skeleton */}
      <div className="px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <Skeleton className="mx-auto h-20 w-20 rounded-2xl" />
        <Skeleton className="mx-auto mt-8 h-12 w-96 max-w-full" />
        <Skeleton className="mx-auto mt-4 h-6 w-80 max-w-full" />
        <div className="mt-10 flex justify-center gap-4">
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>

      {/* Services skeleton */}
      <div className="px-4 py-20 sm:px-6 lg:px-8">
        <Skeleton className="mx-auto h-10 w-48" />
        <Skeleton className="mx-auto mt-4 h-5 w-64" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-6">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="mt-4 h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Memberships skeleton */}
      <div className="px-4 py-20 sm:px-6 lg:px-8">
        <Skeleton className="mx-auto h-10 w-48" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-8">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-6 h-10 w-2/3" />
              <div className="mt-8 space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
