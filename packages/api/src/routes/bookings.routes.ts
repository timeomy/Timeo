import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { bookings, services, users, tenantMemberships } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateBookingSchema } from "../lib/validation.js";
import * as BookingService from "../services/booking.service.js";

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
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customer_id, users.id))
      .leftJoin(services, eq(bookings.service_id, services.id))
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
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.customer_id, users.id))
    .leftJoin(services, eq(bookings.service_id, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return c.json(error("NOT_FOUND", "Booking not found"), 404);
  return c.json(success(row));
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
