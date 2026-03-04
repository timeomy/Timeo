import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import {
  bookings,
  bookingEvents,
  services,
  users,
  tenantMemberships,
  staffAvailability,
  businessHours,
  blockedSlots,
} from "@timeo/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, desc, gte, lt, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateBookingSchema } from "../lib/validation.js";
import * as BookingService from "../services/booking.service.js";

const staffUser = alias(users, "staff_user");

const app = new Hono();

// GET /tenants/:tenantId/bookings - list by tenant (admin/staff)
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select({
        id: bookings.id,
        tenantId: bookings.tenant_id,
        customerId: bookings.customer_id,
        serviceId: bookings.service_id,
        staffId: bookings.staff_id,
        startTime: bookings.start_time,
        endTime: bookings.end_time,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.created_at,
        updatedAt: bookings.updated_at,
        customerName: users.name,
        customerEmail: users.email,
        serviceName: services.name,
        staffName: staffUser.name,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customer_id, users.id))
      .leftJoin(services, eq(bookings.service_id, services.id))
      .leftJoin(staffUser, eq(bookings.staff_id, staffUser.id))
      .where(eq(bookings.tenant_id, tenantId))
      .orderBy(desc(bookings.created_at));

    return c.json(success(rows));
  },
);

// GET /tenants/:tenantId/bookings/mine - customer's own bookings
app.get("/mine", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      id: bookings.id,
      tenantId: bookings.tenant_id,
      customerId: bookings.customer_id,
      serviceId: bookings.service_id,
      staffId: bookings.staff_id,
      startTime: bookings.start_time,
      endTime: bookings.end_time,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.created_at,
      updatedAt: bookings.updated_at,
      serviceName: services.name,
      serviceDuration: services.duration_minutes,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.service_id, services.id))
    .where(
      and(
        eq(bookings.tenant_id, tenantId),
        eq(bookings.customer_id, user.id),
      ),
    )
    .orderBy(desc(bookings.created_at));

  return c.json(success(rows));
});

// GET /tenants/:tenantId/bookings/available-slots?serviceId=&date=YYYY-MM-DD
app.get(
  "/available-slots",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");
    const serviceId = c.req.query("serviceId");
    const dateStr = c.req.query("date"); // YYYY-MM-DD

    if (!serviceId || !dateStr) {
      return c.json(error("BAD_REQUEST", "serviceId and date query params are required"), 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return c.json(error("BAD_REQUEST", "date must be in YYYY-MM-DD format"), 400);
    }

    // 1. Fetch service for duration
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.tenant_id, tenantId)))
      .limit(1);
    if (!service) return c.json(error("NOT_FOUND", "Service not found"), 404);

    // 2. Parse date and get day of week in Asia/Kuala_Lumpur
    const timezone = "Asia/Kuala_Lumpur";
    const [year, month, day] = dateStr.split("-").map(Number);
    // Compute a reference date at noon UTC for the given date (safe from DST edge cases)
    const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = new Date(refDate.toLocaleString("en-US", { timeZone: timezone })).getDay();

    // 3. Fetch business hours for that day
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

    if (!bh || !bh.is_open) {
      return c.json(success({ slots: [] }));
    }

    // 4. Compute open/close as UTC timestamps for that local date
    // getTzOffsetMs: UTC - local (for KL: UTC - (UTC+8) = -8h = -28800000)
    const utcDate = new Date(refDate.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(refDate.toLocaleString("en-US", { timeZone: timezone }));
    const tzOffsetMs = utcDate.getTime() - tzDate.getTime();

    const [openH, openM] = bh.open_time.split(":").map(Number);
    const [closeH, closeM] = bh.close_time.split(":").map(Number);
    const dayMidnightUtc = Date.UTC(year, month - 1, day) - tzOffsetMs;
    const openMs = dayMidnightUtc + (openH * 60 + openM) * 60_000;
    const closeMs = dayMidnightUtc + (closeH * 60 + closeM) * 60_000;
    const dayStartUtc = new Date(dayMidnightUtc);
    const dayEndUtc = new Date(dayMidnightUtc + 24 * 60 * 60_000);

    // 5. Fetch all staff in tenant (admin + staff roles)
    const staffMembers = await db
      .select({ userId: tenantMemberships.user_id, name: users.name })
      .from(tenantMemberships)
      .leftJoin(users, eq(tenantMemberships.user_id, users.id))
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          inArray(tenantMemberships.role, ["admin", "staff"]),
          eq(tenantMemberships.status, "active"),
        ),
      );

    if (staffMembers.length === 0) {
      return c.json(success({ slots: [] }));
    }

    const staffIds = staffMembers.map((s) => s.userId);

    // 6. Fetch staff availability for that day of week
    const availabilities = await db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.tenant_id, tenantId),
          eq(staffAvailability.day_of_week, dayOfWeek),
          inArray(staffAvailability.staff_id, staffIds),
        ),
      );

    // Build set of staff who are available on this day
    // If a staff member has no availability record, treat as available
    const unavailableStaffIds = new Set(
      availabilities.filter((a) => !a.is_available).map((a) => a.staff_id),
    );
    const availableStaffIds = staffIds.filter((id) => !unavailableStaffIds.has(id));

    if (availableStaffIds.length === 0) {
      return c.json(success({ slots: [] }));
    }

    // 7. Fetch existing bookings for that date
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.tenant_id, tenantId),
          inArray(bookings.status, ["confirmed", "pending"]),
          gte(bookings.start_time, dayStartUtc),
          lt(bookings.start_time, dayEndUtc),
          inArray(bookings.staff_id, availableStaffIds),
        ),
      );

    // 8. Fetch blocked slots for that date range
    const blocked = await db
      .select()
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.tenant_id, tenantId),
          lt(blockedSlots.start_time, dayEndUtc),
          gte(blockedSlots.end_time, dayStartUtc),
        ),
      );

    // 9. Generate 30-minute-interval start times
    const durationMs = service.duration_minutes * 60_000;
    const slotInterval = 30 * 60_000;
    const slots: Array<{ startTime: string; endTime: string; availableStaffCount: number }> = [];

    for (let slotStart = openMs; slotStart + durationMs <= closeMs; slotStart += slotInterval) {
      const slotEnd = slotStart + durationMs;

      // Count available staff for this slot
      let availableCount = 0;
      for (const sid of availableStaffIds) {
        // Check no booking overlap
        const hasBookingConflict = existingBookings.some(
          (b) =>
            b.staff_id === sid &&
            slotStart < b.end_time.getTime() &&
            slotEnd > b.start_time.getTime(),
        );
        if (hasBookingConflict) continue;

        // Check no blocked slot overlap
        const hasBlockedConflict = blocked.some(
          (bs) =>
            (bs.staff_id === sid || bs.staff_id === null) &&
            slotStart < bs.end_time.getTime() &&
            slotEnd > bs.start_time.getTime(),
        );
        if (hasBlockedConflict) continue;

        availableCount++;
      }

      if (availableCount > 0) {
        slots.push({
          startTime: new Date(slotStart).toISOString(),
          endTime: new Date(slotEnd).toISOString(),
          availableStaffCount: availableCount,
        });
      }
    }

    return c.json(success({ slots }));
  },
);

// GET /tenants/:tenantId/bookings/:bookingId
app.get("/:bookingId", authMiddleware, tenantMiddleware, async (c) => {
  const bookingId = c.req.param("bookingId");
  const [row] = await db
    .select({
      id: bookings.id,
      tenantId: bookings.tenant_id,
      customerId: bookings.customer_id,
      serviceId: bookings.service_id,
      staffId: bookings.staff_id,
      startTime: bookings.start_time,
      endTime: bookings.end_time,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.created_at,
      updatedAt: bookings.updated_at,
      customerName: users.name,
      customerEmail: users.email,
      serviceName: services.name,
      serviceDuration: services.duration_minutes,
      servicePrice: services.price,
      staffName: staffUser.name,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.customer_id, users.id))
    .leftJoin(services, eq(bookings.service_id, services.id))
    .leftJoin(staffUser, eq(bookings.staff_id, staffUser.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return c.json(error("NOT_FOUND", "Booking not found"), 404);
  return c.json(success(row));
});

// GET /tenants/:tenantId/bookings/:bookingId/events
app.get("/:bookingId/events", authMiddleware, tenantMiddleware, async (c) => {
  const bookingId = c.req.param("bookingId");
  const tenantId = c.get("tenantId");

  const events = await db
    .select()
    .from(bookingEvents)
    .where(
      and(
        eq(bookingEvents.booking_id, bookingId),
        eq(bookingEvents.tenant_id, tenantId),
      ),
    )
    .orderBy(bookingEvents.timestamp);

  return c.json(success(events));
});

// POST /tenants/:tenantId/bookings
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", CreateBookingSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const bookingId = await BookingService.createBooking({
        tenantId,
        serviceId: body.serviceId,
        startTime: new Date(body.startTime),
        staffId: body.staffId,
        notes: body.notes,
        customerId: user.id,
      });
      return c.json(success({ bookingId }), 201);
    } catch (err) {
      return c.json(
        error("BOOKING_ERROR", (err as Error).message),
        422,
      );
    }
  },
);

// PATCH /tenants/:tenantId/bookings/:bookingId/confirm
app.patch(
  "/:bookingId/confirm",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const user = c.get("user");
    try {
      await BookingService.confirmBooking(c.req.param("bookingId"), user.id);
      return c.json(success({ message: "Booking confirmed" }));
    } catch (err) {
      return c.json(
        error("BOOKING_ERROR", (err as Error).message),
        422,
      );
    }
  },
);

// PATCH /tenants/:tenantId/bookings/:bookingId/cancel
app.patch(
  "/:bookingId/cancel",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = await c.req.json().catch(() => ({}));

    const [mem] = await db
      .select()
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, user.id),
        ),
      )
      .limit(1);

    try {
      await BookingService.cancelBooking(
        c.req.param("bookingId"),
        user.id,
        mem?.role ?? "customer",
        body.reason,
      );
      return c.json(success({ message: "Booking cancelled" }));
    } catch (err) {
      return c.json(
        error("BOOKING_ERROR", (err as Error).message),
        422,
      );
    }
  },
);

// PATCH /tenants/:tenantId/bookings/:bookingId/complete
app.patch(
  "/:bookingId/complete",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const user = c.get("user");
    try {
      await BookingService.completeBooking(c.req.param("bookingId"), user.id);
      return c.json(success({ message: "Booking completed" }));
    } catch (err) {
      return c.json(
        error("BOOKING_ERROR", (err as Error).message),
        422,
      );
    }
  },
);

// PATCH /tenants/:tenantId/bookings/:bookingId/no-show
app.patch(
  "/:bookingId/no-show",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const user = c.get("user");
    try {
      await BookingService.markNoShow(c.req.param("bookingId"), user.id);
      return c.json(success({ message: "Booking marked as no-show" }));
    } catch (err) {
      return c.json(
        error("BOOKING_ERROR", (err as Error).message),
        422,
      );
    }
  },
);

export { app as bookingsRouter };
