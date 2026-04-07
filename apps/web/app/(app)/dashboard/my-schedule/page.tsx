"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

type AvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
};

type CoachBooking = {
  id: string;
  client_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  clientName: string;
};

type CoachClient = {
  id: string;
  name: string;
};

function useAvailability() {
  const { tenantId } = useTenantId();
  return useQuery<AvailabilitySlot[]>({
    queryKey: ["coach", tenantId, "availability"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    enabled: !!tenantId,
  });
}

function useCoachBookings() {
  const { tenantId } = useTenantId();
  return useQuery<CoachBooking[]>({
    queryKey: ["coach", tenantId, "bookings"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/bookings`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    enabled: !!tenantId,
  });
}

function useMyClients() {
  const { tenantId } = useTenantId();
  return useQuery<CoachClient[]>({
    queryKey: ["coach", tenantId, "clients"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    enabled: !!tenantId,
  });
}

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatTime(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:00 ${ampm}`;
}

function timeToHour(time: string): number {
  return parseInt(time.split(":")[0]);
}

export default function MySchedulePage() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantId();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddAvail, setShowAddAvail] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<{ day: number; hour: number; date: Date } | null>(null);

  const [availDay, setAvailDay] = useState("1");
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("10:00");
  const [bookingClient, setBookingClient] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  const { data: availability = [] } = useAvailability();
  const { data: bookings = [] } = useCoachBookings();
  const { data: clients = [] } = useMyClients();

  const today = new Date();
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString("en-MY", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [weekDates]);

  const addAvailability = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_of_week: parseInt(availDay), start_time: availStart, end_time: availEnd, is_recurring: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "availability"] });
      setShowAddAvail(false);
    },
  });

  const removeAvailability = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability/${slotId}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "availability"] });
    },
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!bookingSlot) return;
      const dateStr = bookingSlot.date.toISOString().split("T")[0];
      const startStr = `${String(bookingSlot.hour).padStart(2, "0")}:00`;
      const endStr = `${String(bookingSlot.hour + 1).padStart(2, "0")}:00`;
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/bookings`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: bookingClient, booking_date: dateStr, start_time: startStr, end_time: endStr, notes: bookingNotes || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "bookings"] });
      setShowBooking(false);
      setBookingClient("");
      setBookingNotes("");
      setBookingSlot(null);
    },
  });

  const availByDay = useMemo(() => {
    const map: Record<number, AvailabilitySlot[]> = {};
    for (const slot of availability) {
      const day = slot.day_of_week ?? 0;
      if (!map[day]) map[day] = [];
      map[day].push(slot);
    }
    return map;
  }, [availability]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, CoachBooking[]> = {};
    for (const b of bookings) {
      if (!map[b.booking_date]) map[b.booking_date] = [];
      map[b.booking_date].push(b);
    }
    return map;
  }, [bookings]);

  function getCellState(dayIdx: number, hour: number): "available" | "booked" | "past" | "empty" {
    const date = weekDates[dayIdx];
    const dateStr = date.toISOString().split("T")[0];
    const isPast = date < today && !(date.toDateString() === today.toDateString() && hour >= today.getHours());
    if (isPast) return "past";

    const dayBookings = bookingsByDate[dateStr] ?? [];
    const isBooked = dayBookings.some((b) => timeToHour(b.start_time) <= hour && timeToHour(b.end_time) > hour);
    if (isBooked) return "booked";

    const dayOfWeek = dayIdx + 1;
    const daySlots = availByDay[dayOfWeek] ?? [];
    const isAvailable = daySlots.some((s) => timeToHour(s.start_time) <= hour && timeToHour(s.end_time) > hour);
    if (isAvailable) return "available";

    return "empty";
  }

  function getBookingForCell(dayIdx: number, hour: number): CoachBooking | undefined {
    const date = weekDates[dayIdx];
    const dateStr = date.toISOString().split("T")[0];
    return (bookingsByDate[dateStr] ?? []).find((b) => timeToHour(b.start_time) <= hour && timeToHour(b.end_time) > hour);
  }

  function handleCellClick(dayIdx: number, hour: number) {
    const state = getCellState(dayIdx, hour);
    if (state === "past" || state === "booked") return;
    if (state === "available") {
      setBookingSlot({ day: dayIdx, hour, date: weekDates[dayIdx] });
      setShowBooking(true);
    }
  }

  const dayOptions = DAYS.map((d, i) => ({ value: String(i + 1), label: d }));
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            My Schedule
          </h1>
          <p className="text-sm text-white/50 mt-1">Set availability and manage client bookings</p>
        </div>
        <Button onClick={() => setShowAddAvail(true)} className="gap-2 bg-primary hover:bg-primary/90 h-10">
          <Plus className="h-4 w-4" />
          Set Availability
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/30" />Available (click to book)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500/40" />Booked</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/[0.04]" />Past</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)} className="h-8 w-8 p-0 text-white/50 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-white min-w-[200px] text-center">{weekLabel}</span>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)} className="h-8 w-8 p-0 text-white/50 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:text-primary">
            Today
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-8 gap-px mb-1">
            <div className="px-2 py-2" />
            {weekDates.map((date, i) => (
              <div key={i} className="px-2 py-2 text-center">
                <p className={cn("text-xs font-medium", date.toDateString() === today.toDateString() ? "text-primary" : "text-white/40")}>{DAYS[i]}</p>
                <p className={cn("text-base font-bold mt-0.5", date.toDateString() === today.toDateString() ? "text-primary" : "text-white/70")}>{date.getDate()}</p>
              </div>
            ))}
          </div>
          <div className="space-y-px">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-px">
                <div className="px-2 py-1.5 text-right">
                  <span className="text-xs text-white/30">{formatTime(hour)}</span>
                </div>
                {weekDates.map((date, dayIdx) => {
                  const state = getCellState(dayIdx, hour);
                  const booking = state === "booked" ? getBookingForCell(dayIdx, hour) : undefined;
                  return (
                    <div
                      key={dayIdx}
                      onClick={() => handleCellClick(dayIdx, hour)}
                      className={cn(
                        "h-10 rounded-sm transition-all border",
                        state === "available" && "bg-primary/20 border-primary/30 cursor-pointer hover:bg-primary/30",
                        state === "booked" && "bg-emerald-500/20 border-emerald-500/20 cursor-default",
                        state === "past" && "bg-white/[0.02] border-transparent opacity-40",
                        state === "empty" && "bg-white/[0.02] border-transparent hover:bg-white/[0.04] cursor-pointer",
                      )}
                    >
                      {booking && (
                        <div className="px-1.5 py-1">
                          <p className="text-xs text-emerald-300 font-medium truncate">{booking.clientName}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {availability.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recurring Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {availability.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-white/70">
                <span className="text-primary font-medium">{DAYS[(slot.day_of_week ?? 1) - 1]}</span>
                <span>{slot.start_time} – {slot.end_time}</span>
                <button onClick={() => removeAvailability.mutate(slot.id)} className="text-white/30 hover:text-red-400 ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddAvail} onOpenChange={setShowAddAvail}>
        <DialogContent className="bg-[#0d1629] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle>Set Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select label="Day of Week" options={dayOptions} value={availDay} onChange={setAvailDay} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Start Time</label>
                <Input type="time" value={availStart} onChange={(e) => setAvailStart(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white h-10" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">End Time</label>
                <Input type="time" value={availEnd} onChange={(e) => setAvailEnd(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white h-10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddAvail(false)} className="text-white/50">Cancel</Button>
            <Button onClick={() => addAvailability.mutate()} disabled={addAvailability.isPending} className="bg-primary hover:bg-primary/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="bg-[#0d1629] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle>Book Client</DialogTitle>
          </DialogHeader>
          {bookingSlot && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-white/70">
                <p className="font-medium text-white">
                  {DAYS[bookingSlot.day]}, {bookingSlot.date.toLocaleDateString("en-MY", { month: "long", day: "numeric" })}
                </p>
                <p className="text-primary mt-0.5">{formatTime(bookingSlot.hour)} – {formatTime(bookingSlot.hour + 1)}</p>
              </div>
              <Select label="Client" placeholder="Select client..." options={clientOptions} value={bookingClient} onChange={setBookingClient} />
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Notes (optional)</label>
                <Input placeholder="Session notes..." value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white h-10 placeholder:text-white/30" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBooking(false)} className="text-white/50">Cancel</Button>
            <Button onClick={() => createBooking.mutate()} disabled={!bookingClient || createBooking.isPending} className="bg-primary hover:bg-primary/90">Book Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
