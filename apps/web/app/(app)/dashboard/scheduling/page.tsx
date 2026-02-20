"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Input,
  Badge,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

const DEFAULT_HOURS: DayHours[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "09:00",
  closeTime: "17:00",
  isOpen: i >= 1 && i <= 5, // Mon-Fri open
}));

export default function SchedulingPage() {
  const { tenantId } = useTenantId();

  const businessHours = useQuery(
    api.scheduling.getBusinessHours,
    tenantId ? { tenantId: tenantId } : "skip"
  );

  const setBusinessHoursMut = useMutation(api.scheduling.setBusinessHours);

  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (businessHours && !initialized) {
      if (businessHours.length > 0) {
        // Merge server data with defaults for any missing days
        const merged = DEFAULT_HOURS.map((def) => {
          const found = businessHours.find(
            (h: any) => h.dayOfWeek === def.dayOfWeek
          );
          return found
            ? {
                dayOfWeek: found.dayOfWeek,
                openTime: found.openTime,
                closeTime: found.closeTime,
                isOpen: found.isOpen,
              }
            : def;
        });
        setHours(merged);
      }
      setInitialized(true);
    }
  }, [businessHours, initialized]);

  function updateDay(dayOfWeek: number, updates: Partial<DayHours>) {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h
      )
    );
  }

  function handleReset() {
    setHours(DEFAULT_HOURS);
  }

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    setSuccess(false);
    try {
      await setBusinessHoursMut({
        tenantId: tenantId,
        hours: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isOpen: h.isOpen,
        })),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save business hours.");
    } finally {
      setSaving(false);
    }
  }

  const loading = businessHours === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduling</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your business hours and availability.
        </p>
      </div>

      {/* Business Hours */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Business Hours
              </CardTitle>
              <CardDescription className="mt-1">
                Set when your business is open for bookings.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-10 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="hidden items-center gap-4 pb-2 sm:flex">
                <div className="w-24 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Day
                </div>
                <div className="w-12 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Open
                </div>
                <div className="w-28 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Start
                </div>
                <div className="w-4" />
                <div className="w-28 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  End
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              {hours.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="flex flex-col gap-3 rounded-lg border border-white/[0.06] p-3 sm:flex-row sm:items-center sm:gap-4 sm:border-0 sm:p-0"
                >
                  {/* Day label */}
                  <div className="w-24">
                    <span className="text-sm font-medium">
                      {DAY_LABELS[day.dayOfWeek]}
                    </span>
                  </div>

                  {/* Toggle */}
                  <div className="flex w-12 justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateDay(day.dayOfWeek, { isOpen: !day.isOpen })
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        day.isOpen
                          ? "bg-primary"
                          : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          day.isOpen ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Time inputs */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDay(day.dayOfWeek, { openTime: e.target.value })
                      }
                      disabled={!day.isOpen}
                      className="w-28 text-center font-mono text-sm disabled:opacity-40"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDay(day.dayOfWeek, { closeTime: e.target.value })
                      }
                      disabled={!day.isOpen}
                      className="w-28 text-center font-mono text-sm disabled:opacity-40"
                    />
                  </div>

                  {/* Status */}
                  <div className="sm:ml-auto">
                    {day.isOpen ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      >
                        Open
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      >
                        Closed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {!loading && (
          <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Business hours saved
              </div>
            )}
            {!success && <div />}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Hours"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
