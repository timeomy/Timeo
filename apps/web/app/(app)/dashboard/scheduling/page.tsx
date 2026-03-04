"use client";

import { useState, useEffect } from "react";
import {
  useBusinessHours,
  useUpdateBusinessHours,
  useStaffMembers,
  useStaffAvailability,
  useUpdateStaffAvailability,
  useBlockedSlots,
  useCreateBlockedSlot,
  useDeleteBlockedSlot,
} from "@timeo/api-client";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
} from "@timeo/ui/web";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Users,
  CalendarOff,
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

const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

interface StaffScheduleDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_STAFF_SCHEDULE: StaffScheduleDay[] = Array.from(
  { length: 7 },
  (_, i) => ({
    dayOfWeek: i,
    isAvailable: i >= 1 && i <= 5,
    startTime: "09:00",
    endTime: "17:00",
  }),
);

export default function SchedulingPage() {
  const { tenantId } = useTenantId();

  const { data: businessHours, isLoading } = useBusinessHours(tenantId ?? "");
  const { mutateAsync: setBusinessHoursMut } = useUpdateBusinessHours(
    tenantId ?? "",
  );

  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (businessHours && !initialized) {
      if (businessHours.length > 0) {
        const merged = DEFAULT_HOURS.map((def) => {
          const found = businessHours.find(
            (h: any) => h.dayOfWeek === def.dayOfWeek,
          );
          return found
            ? {
                dayOfWeek: found.dayOfWeek,
                openTime: found.openTime ?? def.openTime,
                closeTime: found.closeTime ?? def.closeTime,
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
        h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h,
      ),
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

  const loading = isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduling</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your business hours, staff availability, and blocked slots.
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
                        day.isOpen ? "bg-primary" : "bg-zinc-700"
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
            <Button onClick={handleSave} disabled={saving} className="gap-2">
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

      {/* Staff Availability */}
      <StaffAvailabilitySection tenantId={tenantId} />

      {/* Blocked Slots */}
      <BlockedSlotsSection tenantId={tenantId} />
    </div>
  );
}

// ─── Staff Availability Section ─────────────────────────────────────────────

function StaffAvailabilitySection({
  tenantId,
}: {
  tenantId: string | null;
}) {
  const { data: staffMembers, isLoading: staffLoading } = useStaffMembers(
    tenantId,
  );
  // Fetch all staff availability at once (API returns array)
  const { data: allAvailability, isLoading: availLoading } =
    useStaffAvailability(tenantId, tenantId);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Staff Availability
        </CardTitle>
        <CardDescription>
          Set individual availability schedules for each staff member.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {staffLoading || availLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-20" />
                ))}
              </div>
            ))}
          </div>
        ) : !staffMembers || staffMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No staff members found. Add staff in the Team page first.
          </p>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="hidden items-center gap-2 pb-2 lg:flex">
              <div className="w-36 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Staff
              </div>
              {DAY_LABELS_SHORT.map((d) => (
                <div
                  key={d}
                  className="w-24 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              <div className="w-16" />
            </div>

            <Separator className="bg-white/[0.06]" />

            {staffMembers.map((staff) => {
              const staffAvail = allAvailability?.find(
                (a: any) =>
                  a.staffId === staff.userId || a.staffId === staff.id,
              );
              return (
                <StaffAvailabilityRow
                  key={staff.id}
                  tenantId={tenantId ?? ""}
                  staff={staff}
                  availability={staffAvail ?? null}
                  isEditing={editingStaffId === staff.id}
                  onEdit={() => setEditingStaffId(staff.id)}
                  onClose={() => setEditingStaffId(null)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffAvailabilityRow({
  tenantId,
  staff,
  availability,
  isEditing,
  onEdit,
  onClose,
}: {
  tenantId: string;
  staff: { id: string; userId: string; name: string };
  availability: { staffId: string; schedule: any[]; overrides?: any[] } | null;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { mutateAsync: updateAvailability } = useUpdateStaffAvailability(
    tenantId,
    staff.userId,
  );

  const [editSchedule, setEditSchedule] = useState<StaffScheduleDay[]>(
    DEFAULT_STAFF_SCHEDULE,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (availability?.schedule) {
      const merged = DEFAULT_STAFF_SCHEDULE.map((def) => {
        const found = availability.schedule.find(
          (s: any) => s.dayOfWeek === def.dayOfWeek,
        );
        if (!found) return def;
        return {
          dayOfWeek: found.dayOfWeek,
          isAvailable: found.isOpen ?? def.isAvailable,
          startTime: found.openTime ?? found.slots?.[0]?.start ?? def.startTime,
          endTime:
            found.closeTime ?? found.slots?.[0]?.end ?? def.endTime,
        };
      });
      setEditSchedule(merged);
    }
  }, [availability]);

  const schedule =
    availability?.schedule ??
    DEFAULT_STAFF_SCHEDULE.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      isOpen: d.isAvailable,
      openTime: d.startTime,
      closeTime: d.endTime,
    }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateAvailability({
        schedule: editSchedule.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isOpen: d.isAvailable,
          openTime: d.startTime,
          closeTime: d.endTime,
        })),
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  }

  function formatDayDisplay(day: any): string {
    if (!day.isOpen && !day.isAvailable) return "Off";
    const start = day.openTime ?? day.startTime ?? day.slots?.[0]?.start;
    const end = day.closeTime ?? day.endTime ?? day.slots?.[0]?.end;
    if (!start || !end) return "Off";
    return `${start}–${end}`;
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] p-3 lg:flex-row lg:items-center lg:gap-2 lg:border-0 lg:p-1">
        <div className="w-36 truncate">
          <span className="text-sm font-medium">{staff.name}</span>
        </div>
        {schedule.map((day: any, idx: number) => {
          const display = formatDayDisplay(day);
          const isOff = display === "Off";
          return (
            <div key={idx} className="w-24 text-center text-xs">
              <span className="lg:hidden text-muted-foreground mr-1">
                {DAY_LABELS_SHORT[day.dayOfWeek]}:
              </span>
              <span
                className={isOff ? "text-muted-foreground" : "text-white"}
              >
                {display}
              </span>
            </div>
          );
        })}
        <div className="w-16 flex justify-end lg:ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability — {staff.name}</DialogTitle>
            <DialogDescription>
              Set weekly availability schedule for this staff member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {editSchedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-3"
              >
                <div className="w-20">
                  <span className="text-sm font-medium">
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditSchedule((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, isAvailable: !d.isAvailable }
                          : d,
                      ),
                    )
                  }
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    day.isAvailable ? "bg-primary" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      day.isAvailable ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <Input
                  type="time"
                  value={day.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditSchedule((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, startTime: e.target.value }
                          : d,
                      ),
                    )
                  }
                  disabled={!day.isAvailable}
                  className="w-24 text-center font-mono text-xs disabled:opacity-40"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={day.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditSchedule((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, endTime: e.target.value }
                          : d,
                      ),
                    )
                  }
                  disabled={!day.isAvailable}
                  className="w-24 text-center font-mono text-xs disabled:opacity-40"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Blocked Slots Section ──────────────────────────────────────────────────

function BlockedSlotsSection({
  tenantId,
}: {
  tenantId: string | null;
}) {
  const { data: staffMembers } = useStaffMembers(tenantId);
  const { data: blockedSlots, isLoading } = useBlockedSlots(tenantId);
  const { mutateAsync: createBlockedSlot } = useCreateBlockedSlot(
    tenantId ?? "",
  );
  const { mutateAsync: deleteBlockedSlot } = useDeleteBlockedSlot(
    tenantId ?? "",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    startTime: "",
    endTime: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!form.startTime || !form.endTime) return;
    setSaving(true);
    try {
      await createBlockedSlot({
        staffId: form.staffId || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        reason: form.reason.trim() || undefined,
      });
      setDialogOpen(false);
      setForm({ staffId: "", startTime: "", endTime: "", reason: "" });
    } catch (err: any) {
      alert(err.message || "Failed to create blocked slot.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slotId: string) {
    setDeletingId(slotId);
    try {
      await deleteBlockedSlot(slotId);
    } catch (err: any) {
      alert(err.message || "Failed to delete blocked slot.");
    } finally {
      setDeletingId(null);
    }
  }

  function getStaffName(staffId?: string): string {
    if (!staffId) return "All Staff";
    const found = staffMembers?.find(
      (s) => s.id === staffId || s.userId === staffId,
    );
    return found?.name ?? "Unknown";
  }

  const staffOptions = [
    { label: "All Staff", value: "" },
    ...(staffMembers?.map((s) => ({ label: s.name, value: s.id })) ?? []),
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarOff className="h-5 w-5 text-primary" />
              Blocked Slots
            </CardTitle>
            <CardDescription className="mt-1">
              Block specific time ranges to prevent bookings.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Blocked Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !blockedSlots || blockedSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blocked slots. All times are available for bookings.
          </p>
        ) : (
          <div className="space-y-2">
            {blockedSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {new Date(slot.startTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">
                      {new Date(slot.endTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getStaffName(slot.staffId)}</span>
                    {slot.reason && (
                      <>
                        <span>-</span>
                        <span>{slot.reason}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deletingId === slot.id}
                  onClick={() => handleDelete(slot.id)}
                >
                  {deletingId === slot.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Blocked Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blocked Slot</DialogTitle>
            <DialogDescription>
              Block a time range to prevent bookings during this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              label="Staff Member"
              options={staffOptions}
              value={form.staffId}
              onChange={(value) => setForm({ ...form, staffId: value })}
            />
            <Input
              label="Start Time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) =>
                setForm({ ...form, startTime: e.target.value })
              }
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Reason (optional)
              </label>
              <textarea
                placeholder="e.g., Staff training, holiday..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
                rows={2}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.startTime || !form.endTime}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
