"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useServiceCatalog,
  useAvailableSlots,
  useCreateBooking,
} from "@timeo/api-client";
import type { ServiceCatalogItem } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  ShoppingBag,
  Tag,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(priceCents / 100);
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Returns "YYYY-MM-DD" in local time */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = ["Service", "Date & Time", "Confirm"] as const;
type Step = 0 | 1 | 2;

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-primary text-white"
                    : "bg-white/[0.08] text-white/30"
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  active ? "text-white" : done ? "text-emerald-400" : "text-white/30"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-1", done ? "bg-emerald-500/40" : "bg-white/[0.06]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Pick service ─────────────────────────────────────────────────────

function ServiceStep({
  tenantId,
  selected,
  onSelect,
}: {
  tenantId: string;
  selected: ServiceCatalogItem | null;
  onSelect: (item: ServiceCatalogItem) => void;
}) {
  const { data: items, isLoading } = useServiceCatalog(tenantId);
  const active = items?.filter((i) => i.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <ShoppingBag className="h-7 w-7 text-white/20" />
        </div>
        <p className="text-base font-semibold text-white/60">No services available</p>
        <p className="mt-1.5 text-sm text-white/30 max-w-xs">
          Your gym hasn&apos;t listed any bookable services yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {active.map((item) => {
        const isSelected = selected?.id === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={cn(
              "relative text-left rounded-2xl border p-4 transition-all",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15]"
            )}
          >
            {isSelected && (
              <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
            )}
            {item.category && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
                <Tag className="h-2.5 w-2.5" />
                {item.category}
              </span>
            )}
            <p className="text-sm font-semibold text-white leading-tight">{item.name}</p>
            {item.description && (
              <p className="mt-1 text-xs text-white/40 line-clamp-2">{item.description}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-bold text-primary">{formatPrice(item.price)}</span>
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="h-3 w-3" />
                {item.durationMinutes}m
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: Pick date & time ─────────────────────────────────────────────────

function SlotStep({
  tenantId,
  serviceId,
  date,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: {
  tenantId: string;
  serviceId: string;
  date: string;
  selectedSlot: string | null;
  onDateChange: (d: string) => void;
  onSlotSelect: (startTime: string) => void;
}) {
  const { data: slotsData, isLoading } = useAvailableSlots(tenantId, serviceId, date);
  const slots = slotsData?.slots ?? [];

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div>
        <label className="mb-2 block text-sm font-medium text-white/70">
          <Calendar className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Select Date
        </label>
        <input
          type="date"
          value={date}
          min={today()}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* Time slots */}
      <div>
        <p className="mb-2 text-sm font-medium text-white/70">
          <Clock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Available Times
        </p>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] py-8 text-center">
            <p className="text-sm text-white/40">No slots available for this date</p>
            <p className="mt-1 text-xs text-white/25">Try selecting a different day</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.startTime;
              return (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(slot.startTime)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  {formatSlotTime(slot.startTime)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Confirm ─────────────────────────────────────────────────────────

function ConfirmStep({
  service,
  startTime,
  notes,
  onNotesChange,
}: {
  service: ServiceCatalogItem;
  startTime: string;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const date = new Date(startTime);
  const endDate = new Date(date.getTime() + service.durationMinutes * 60_000);

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <Card className="glass border-white/[0.10]">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-0.5">Service</p>
            <p className="text-base font-bold text-white">{service.name}</p>
            {service.category && (
              <p className="text-xs text-white/40 mt-0.5">{service.category}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-0.5">Date</p>
              <p className="text-sm font-medium text-white">
                {date.toLocaleDateString("en-MY", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-0.5">Time</p>
              <p className="text-sm font-medium text-white">
                {formatSlotTime(startTime)} – {formatSlotTime(endDate.toISOString())}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-0.5">Duration</p>
              <p className="text-sm font-medium text-white">{service.durationMinutes} min</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-0.5">Price</p>
              <p className="text-sm font-bold text-primary">{formatPrice(service.price)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">
          Notes <span className="text-white/30">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Anything you'd like us to know before your session..."
          rows={3}
          className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 resize-none transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const router = useRouter();
  const { tenantId } = useTenantId();

  const [step, setStep] = useState<Step>(0);
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const createBooking = useCreateBooking(tenantId ?? "");

  const canNext =
    step === 0
      ? !!selectedService
      : step === 1
      ? !!selectedSlot
      : true;

  function handleNext() {
    if (step < 2) setStep((s) => (s + 1) as Step);
  }

  function handleBack() {
    if (step > 0) setStep((s) => (s - 1) as Step);
    else router.push("/portal/bookings");
  }

  async function handleSubmit() {
    if (!tenantId || !selectedService || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await createBooking.mutateAsync({
        serviceId: selectedService.id,
        startTime: selectedSlot,
        notes: notes.trim() || undefined,
      });
      router.push("/portal/bookings?booked=1");
    } catch (err) {
      setSubmitError((err as Error)?.message || "Failed to create booking. Please try again.");
      setSubmitting(false);
    }
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-white/50">Not linked to a gym yet.</p>
        <Link href="/portal" className="mt-3 text-sm text-primary hover:underline">
          Go to portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Book a Session</h1>
          <p className="text-xs text-white/40">
            {step === 0 ? "Choose a service" : step === 1 ? "Pick a date and time" : "Review and confirm"}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepBar current={step} />

      {/* Step content */}
      {step === 0 && (
        <ServiceStep
          tenantId={tenantId}
          selected={selectedService}
          onSelect={(item) => {
            setSelectedService(item);
            // Reset slot when service changes
            setSelectedSlot(null);
          }}
        />
      )}

      {step === 1 && selectedService && (
        <SlotStep
          tenantId={tenantId}
          serviceId={selectedService.id}
          date={selectedDate}
          selectedSlot={selectedSlot}
          onDateChange={(d) => {
            setSelectedDate(d);
            setSelectedSlot(null);
          }}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {step === 2 && selectedService && selectedSlot && (
        <ConfirmStep
          service={selectedService}
          startTime={selectedSlot}
          notes={notes}
          onNotesChange={setNotes}
        />
      )}

      {/* Error */}
      {submitError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={handleBack} disabled={submitting}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < 2 ? (
          <Button onClick={handleNext} disabled={!canNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canNext}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Booking
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
