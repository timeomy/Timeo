import { db } from "@timeo/db";
import {
  bookings,
  bookingEvents,
  services,
  tenants,
  tenantMemberships,
  staffAvailability,
  businessHours,
  blockedSlots,
  auditLogs,
} from "@timeo/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";

interface CreateBookingInput {
  tenantId: string;
  serviceId: string;
  startTime: Date;
  staffId?: string;
  notes?: string;
  customerId: string;
}

export async function createBooking(input: CreateBookingInput) {
  const { tenantId, serviceId, startTime, staffId, notes, customerId } = input;

  // Get service
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenant_id, tenantId)))
    .limit(1);
  if (!service) throw new Error("Service not found in this tenant");
  if (!service.is_active) throw new Error("Service is not currently available");

  const endTime = new Date(
    startTime.getTime() + service.duration_minutes * 60 * 1000,
  );

  // Get tenant for timezone + autoConfirm settings
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const timezone = (settings.timezone as string) ?? "Asia/Kuala_Lumpur";

  // Check business hours
  const dayOfWeek = new Date(
    startTime.toLocaleString("en-US", { timeZone: timezone }),
  ).getDay();

  const [bh] = await db
    .select()
    .from(businessHours)
    .where(
      and(
        eq(businessHours.tenant_id, tenantId),
        eq(businessHours.day_of_week, dayOfWeek),
      ),
    )
    .limit(1);

  if (bh) {
    if (!bh.is_open) throw new Error("Business is closed on this day");

    const [openH, openM] = bh.open_time.split(":").map(Number);
    const [closeH, closeM] = bh.close_time.split(":").map(Number);
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const openMs = dayStart.getTime() + (openH * 60 + openM) * 60 * 1000;
    const closeMs = dayStart.getTime() + (closeH * 60 + closeM) * 60 * 1000;

    if (startTime.getTime() < openMs || endTime.getTime() > closeMs) {
      throw new Error("Requested time is outside business hours");
    }
  }

  let assignedStaffId = staffId;

  if (assignedStaffId) {
    await validateStaffAvailability(
      assignedStaffId,
      tenantId,
      dayOfWeek,
      startTime,
      endTime,
    );
  } else {
    assignedStaffId = await autoAssignStaff(
      tenantId,
      dayOfWeek,
      startTime,
      endTime,
    );
  }

  const initialStatus =
    settings.autoConfirmBookings === true ? "confirmed" : "pending";
  const bookingId = generateId();

  await db.insert(bookings).values({
    id: bookingId,
    tenant_id: tenantId,
    customer_id: customerId,
    service_id: serviceId,
    staff_id: assignedStaffId ?? null,
    start_time: startTime,
    end_time: endTime,
    status: initialStatus as "confirmed" | "pending",
    notes: notes ?? null,
  });

  await db.insert(bookingEvents).values({
    id: generateId(),
    tenant_id: tenantId,
    booking_id: bookingId,
    type: "created",
    actor_id: customerId,
  });

  if (initialStatus === "confirmed") {
    await db.insert(bookingEvents).values({
      id: generateId(),
      tenant_id: tenantId,
      booking_id: bookingId,
      type: "confirmed",
      actor_id: customerId,
      metadata: { autoConfirmed: true },
    });
  }

  emitToTenant(tenantId, SocketEvents.BOOKING_CREATED, {
    bookingId,
    tenantId,
  });
  return bookingId;
}

async function validateStaffAvailability(
  staffId: string,
  tenantId: string,
  dayOfWeek: number,
  startTime: Date,
  endTime: Date,
) {
  const [dayAvail] = await db
    .select()
    .from(staffAvailability)
    .where(
      and(
        eq(staffAvailability.staff_id, staffId),
        eq(staffAvailability.tenant_id, tenantId),
        eq(staffAvailability.day_of_week, dayOfWeek),
      ),
    )
    .limit(1);

  if (dayAvail && !dayAvail.is_available) {
    throw new Error("Selected staff member is not available on this day");
  }

  // Check booking conflicts
  const conflicts = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.staff_id, staffId),
        eq(bookings.tenant_id, tenantId),
        ne(bookings.status, "cancelled"),
      ),
    );

  const hasConflict = conflicts.some(
    (b) => startTime < b.end_time && endTime > b.start_time,
  );
  if (hasConflict) throw new Error("Selected time slot is already booked");

  // Check blocked slots
  const blocked = await db
    .select()
    .from(blockedSlots)
    .where(
      and(
        eq(blockedSlots.staff_id, staffId),
        eq(blockedSlots.tenant_id, tenantId),
      ),
    );

  const isBlocked = blocked.some(
    (bs) => startTime < bs.end_time && endTime > bs.start_time,
  );
  if (isBlocked) throw new Error("Selected time slot is blocked");
}

async function autoAssignStaff(
  tenantId: string,
  dayOfWeek: number,
  startTime: Date,
  endTime: Date,
): Promise<string | undefined> {
  const staffMembers = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.role, "staff"),
        eq(tenantMemberships.status, "active"),
      ),
    );

  for (const member of staffMembers) {
    const [dayAvail] = await db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.staff_id, member.user_id),
          eq(staffAvailability.tenant_id, tenantId),
          eq(staffAvailability.day_of_week, dayOfWeek),
        ),
      )
      .limit(1);
    if (dayAvail && !dayAvail.is_available) continue;

    const conflicts = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.staff_id, member.user_id),
          eq(bookings.tenant_id, tenantId),
          ne(bookings.status, "cancelled"),
        ),
      );
    const hasConflict = conflicts.some(
      (b) => startTime < b.end_time && endTime > b.start_time,
    );
    if (hasConflict) continue;

    const blocked = await db
      .select()
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.staff_id, member.user_id),
          eq(blockedSlots.tenant_id, tenantId),
        ),
      );
    const isBlocked = blocked.some(
      (bs) => startTime < bs.end_time && endTime > bs.start_time,
    );
    if (isBlocked) continue;

    return member.user_id;
  }

  return undefined;
}

export async function confirmBooking(bookingId: string, actorId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "pending")
    throw new Error("Only pending bookings can be confirmed");

  await db
    .update(bookings)
    .set({ status: "confirmed", updated_at: new Date() })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    id: generateId(),
    tenant_id: booking.tenant_id,
    booking_id: bookingId,
    type: "confirmed",
    actor_id: actorId,
  });

  await insertAuditLog({
    tenantId: booking.tenant_id,
    actorId,
    action: "booking.confirmed",
    resource: "bookings",
    resourceId: bookingId,
  });

  emitToTenant(booking.tenant_id, SocketEvents.BOOKING_UPDATED, {
    bookingId,
    status: "confirmed",
  });
}

export async function cancelBooking(
  bookingId: string,
  actorId: string,
  actorRole: string,
  reason?: string,
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) throw new Error("Booking not found");

  const isCustomer = booking.customer_id === actorId;
  const isStaffOrAdmin = actorRole === "admin" || actorRole === "staff";
  if (!isCustomer && !isStaffOrAdmin) {
    throw new Error("Not authorized to cancel this booking");
  }
  if (booking.status === "completed" || booking.status === "cancelled") {
    throw new Error("Cannot cancel a completed or already cancelled booking");
  }

  await db
    .update(bookings)
    .set({ status: "cancelled", updated_at: new Date() })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    id: generateId(),
    tenant_id: booking.tenant_id,
    booking_id: bookingId,
    type: "cancelled",
    actor_id: actorId,
    metadata: reason ? { reason } : null,
  });

  await insertAuditLog({
    tenantId: booking.tenant_id,
    actorId,
    action: "booking.cancelled",
    resource: "bookings",
    resourceId: bookingId,
  });

  emitToTenant(booking.tenant_id, SocketEvents.BOOKING_UPDATED, {
    bookingId,
    status: "cancelled",
  });
}

export async function completeBooking(bookingId: string, actorId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "confirmed")
    throw new Error("Only confirmed bookings can be completed");

  await db
    .update(bookings)
    .set({ status: "completed", updated_at: new Date() })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    id: generateId(),
    tenant_id: booking.tenant_id,
    booking_id: bookingId,
    type: "completed",
    actor_id: actorId,
  });

  await insertAuditLog({
    tenantId: booking.tenant_id,
    actorId,
    action: "booking.completed",
    resource: "bookings",
    resourceId: bookingId,
  });

  emitToTenant(booking.tenant_id, SocketEvents.BOOKING_UPDATED, {
    bookingId,
    status: "completed",
  });
}

export async function markNoShow(bookingId: string, actorId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "confirmed")
    throw new Error("Only confirmed bookings can be marked as no-show");

  await db
    .update(bookings)
    .set({ status: "no_show", updated_at: new Date() })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    id: generateId(),
    tenant_id: booking.tenant_id,
    booking_id: bookingId,
    type: "no_show",
    actor_id: actorId,
  });

  await insertAuditLog({
    tenantId: booking.tenant_id,
    actorId,
    action: "booking.no_show",
    resource: "bookings",
    resourceId: bookingId,
  });

  emitToTenant(booking.tenant_id, SocketEvents.BOOKING_UPDATED, {
    bookingId,
    status: "no_show",
  });
}

async function insertAuditLog(input: {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: unknown;
}) {
  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    action: input.action,
    resource: input.resource,
    resource_id: input.resourceId,
    metadata: input.metadata ?? null,
  });
}
