import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog, insertBookingEvent } from "./lib/helpers";
import { internal } from "./_generated/api";

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    return await Promise.all(
      bookings.map(async (b) => {
        const customer = await ctx.db.get(b.customerId);
        const service = await ctx.db.get(b.serviceId);
        const staff = b.staffId ? await ctx.db.get(b.staffId) : null;
        return {
          ...b,
          customerName: customer?.name ?? "Unknown",
          serviceName: service?.name ?? "Unknown",
          staffName: staff?.name,
        };
      })
    );
  },
});

export const listByCustomer = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .collect();

    const filtered = bookings.filter((b) => b.tenantId === args.tenantId);

    return await Promise.all(
      filtered.map(async (b) => {
        const service = await ctx.db.get(b.serviceId);
        const staff = b.staffId ? await ctx.db.get(b.staffId) : null;
        return {
          ...b,
          serviceName: service?.name ?? "Unknown",
          serviceDuration: service?.durationMinutes,
          staffName: staff?.name,
        };
      })
    );
  },
});

export const listByStaff = query({
  args: { tenantId: v.id("tenants"), staffId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .order("desc")
      .collect();

    const filtered = bookings.filter((b) => b.tenantId === args.tenantId);

    return await Promise.all(
      filtered.map(async (b) => {
        const customer = await ctx.db.get(b.customerId);
        const service = await ctx.db.get(b.serviceId);
        return {
          ...b,
          customerName: customer?.name ?? "Unknown",
          serviceName: service?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getById = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    await requireTenantAccess(ctx, booking.tenantId);

    const customer = await ctx.db.get(booking.customerId);
    const service = await ctx.db.get(booking.serviceId);
    const staff = booking.staffId ? await ctx.db.get(booking.staffId) : null;

    return {
      ...booking,
      customerName: customer?.name ?? "Unknown",
      customerEmail: customer?.email,
      serviceName: service?.name ?? "Unknown",
      serviceDuration: service?.durationMinutes,
      servicePrice: service?.price,
      staffName: staff?.name,
    };
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    serviceId: v.id("services"),
    startTime: v.number(),
    staffId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.tenantId !== args.tenantId) {
      throw new Error("Service not found in this tenant");
    }
    if (!service.isActive) {
      throw new Error("Service is not currently available");
    }

    const endTime = args.startTime + service.durationMinutes * 60 * 1000;
    const now = Date.now();

    const tenant = await ctx.db.get(args.tenantId);
    const timezone = tenant?.settings?.timezone ?? "Asia/Kuala_Lumpur";

    // ── Availability validation ──────────────────────────────────────

    // Check business hours
    const requestDate = new Date(args.startTime);
    const dayStr = requestDate.toLocaleDateString("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = dayMap[dayStr] ?? 0;

    const businessHours = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant_day", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", dayOfWeek)
      )
      .unique();

    if (businessHours) {
      if (!businessHours.isOpen) {
        throw new Error("Business is closed on this day");
      }
      // Validate time falls within business hours
      const midnightLocal = new Date(
        new Date(args.startTime).toLocaleString("en-US", { timeZone: timezone })
      );
      midnightLocal.setHours(0, 0, 0, 0);
      const utcRef = new Date(
        new Date(args.startTime).toLocaleString("en-US", { timeZone: "UTC" })
      );
      const localRef = new Date(
        new Date(args.startTime).toLocaleString("en-US", { timeZone: timezone })
      );
      const offset = utcRef.getTime() - localRef.getTime();
      const dayStart = midnightLocal.getTime() + offset;

      const [openH, openM] = businessHours.openTime.split(":").map(Number);
      const [closeH, closeM] = businessHours.closeTime.split(":").map(Number);
      const openMs = dayStart + (openH * 60 + openM) * 60 * 1000;
      const closeMs = dayStart + (closeH * 60 + closeM) * 60 * 1000;

      if (args.startTime < openMs || endTime > closeMs) {
        throw new Error("Requested time is outside business hours");
      }
    }

    // Determine staff assignment
    let assignedStaffId = args.staffId;

    if (assignedStaffId) {
      // Validate the specific staff member's availability
      const staffAvail = await ctx.db
        .query("staffAvailability")
        .withIndex("by_staff", (q) => q.eq("staffId", assignedStaffId!))
        .collect();
      const dayAvail = staffAvail.find(
        (a) => a.tenantId === args.tenantId && a.dayOfWeek === dayOfWeek
      );
      if (dayAvail && !dayAvail.isAvailable) {
        throw new Error("Selected staff member is not available on this day");
      }

      // Check for conflicts with existing bookings
      const staffBookings = await ctx.db
        .query("bookings")
        .withIndex("by_staff", (q) => q.eq("staffId", assignedStaffId!))
        .collect();
      const hasConflict = staffBookings.some(
        (b) =>
          b.tenantId === args.tenantId &&
          b.status !== "cancelled" &&
          args.startTime < b.endTime &&
          endTime > b.startTime
      );
      if (hasConflict) {
        throw new Error("Selected time slot is already booked");
      }

      // Check for blocked slots
      const blockedSlots = await ctx.db
        .query("blockedSlots")
        .withIndex("by_staff", (q) => q.eq("staffId", assignedStaffId!))
        .collect();
      const isBlocked = blockedSlots.some(
        (bs) =>
          bs.tenantId === args.tenantId &&
          args.startTime < bs.endTime &&
          endTime > bs.startTime
      );
      if (isBlocked) {
        throw new Error("Selected time slot is blocked");
      }
    } else {
      // Auto-assign: find first available staff
      const staffMemberships = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_role", (q) =>
          q.eq("tenantId", args.tenantId).eq("role", "staff")
        )
        .collect();
      const activeStaff = staffMemberships.filter(
        (m) => m.status === "active"
      );

      for (const staffMember of activeStaff) {
        // Check day availability
        const staffAvail = await ctx.db
          .query("staffAvailability")
          .withIndex("by_staff", (q) => q.eq("staffId", staffMember.userId))
          .collect();
        const dayAvail = staffAvail.find(
          (a) => a.tenantId === args.tenantId && a.dayOfWeek === dayOfWeek
        );
        if (dayAvail && !dayAvail.isAvailable) continue;

        // Check booking conflicts
        const staffBookings = await ctx.db
          .query("bookings")
          .withIndex("by_staff", (q) => q.eq("staffId", staffMember.userId))
          .collect();
        const hasConflict = staffBookings.some(
          (b) =>
            b.tenantId === args.tenantId &&
            b.status !== "cancelled" &&
            args.startTime < b.endTime &&
            endTime > b.startTime
        );
        if (hasConflict) continue;

        // Check blocked slots
        const blockedSlots = await ctx.db
          .query("blockedSlots")
          .withIndex("by_staff", (q) => q.eq("staffId", staffMember.userId))
          .collect();
        const isBlocked = blockedSlots.some(
          (bs) =>
            bs.tenantId === args.tenantId &&
            args.startTime < bs.endTime &&
            endTime > bs.startTime
        );
        if (isBlocked) continue;

        assignedStaffId = staffMember.userId;
        break;
      }
    }

    const initialStatus =
      tenant?.settings?.autoConfirmBookings === true
        ? ("confirmed" as const)
        : ("pending" as const);

    const bookingId = await ctx.db.insert("bookings", {
      tenantId: args.tenantId,
      customerId: user._id,
      serviceId: args.serviceId,
      staffId: assignedStaffId,
      startTime: args.startTime,
      endTime,
      status: initialStatus,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await insertBookingEvent(ctx, {
      tenantId: args.tenantId,
      bookingId,
      type: "created",
      actorId: user._id,
    });

    if (initialStatus === "confirmed") {
      await insertBookingEvent(ctx, {
        tenantId: args.tenantId,
        bookingId,
        type: "confirmed",
        actorId: user._id,
        metadata: { autoConfirmed: true },
      });

      // Send booking confirmation notification
      await ctx.scheduler.runAfter(
        0,
        internal.actions.notifications.sendBookingConfirmation,
        { bookingId }
      );
    }

    return bookingId;
  },
});

export const confirm = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const { user } = await requireRole(ctx, booking.tenantId, [
      "admin",
      "staff",
    ]);

    if (booking.status !== "pending") {
      throw new Error("Only pending bookings can be confirmed");
    }

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });

    await insertBookingEvent(ctx, {
      tenantId: booking.tenantId,
      bookingId: args.bookingId,
      type: "confirmed",
      actorId: user._id,
    });

    await insertAuditLog(ctx, {
      tenantId: booking.tenantId,
      actorId: user._id,
      action: "booking.confirmed",
      resource: "bookings",
      resourceId: args.bookingId,
    });

    // Send booking confirmation notification
    await ctx.scheduler.runAfter(
      0,
      internal.actions.notifications.sendBookingConfirmation,
      { bookingId: args.bookingId }
    );
  },
});

export const cancel = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const user = await authenticateUser(ctx);
    const { membership } = await requireTenantAccess(ctx, booking.tenantId);

    const isCustomer = booking.customerId === user._id;
    const isStaffOrAdmin =
      membership.role === "admin" || membership.role === "staff";
    if (!isCustomer && !isStaffOrAdmin) {
      throw new Error("Not authorized to cancel this booking");
    }

    if (booking.status === "completed" || booking.status === "cancelled") {
      throw new Error("Cannot cancel a completed or already cancelled booking");
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    await insertBookingEvent(ctx, {
      tenantId: booking.tenantId,
      bookingId: args.bookingId,
      type: "cancelled",
      actorId: user._id,
      metadata: args.reason ? { reason: args.reason } : undefined,
    });

    await insertAuditLog(ctx, {
      tenantId: booking.tenantId,
      actorId: user._id,
      action: "booking.cancelled",
      resource: "bookings",
      resourceId: args.bookingId,
      metadata: args.reason ? { reason: args.reason } : undefined,
    });

    // Send cancellation notification
    await ctx.scheduler.runAfter(
      0,
      internal.actions.notifications.sendBookingCancellation,
      {
        bookingId: args.bookingId,
        cancelledByUserId: user._id,
        reason: args.reason,
      }
    );
  },
});

export const complete = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const { user } = await requireRole(ctx, booking.tenantId, [
      "admin",
      "staff",
    ]);

    if (booking.status !== "confirmed") {
      throw new Error("Only confirmed bookings can be completed");
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    await insertBookingEvent(ctx, {
      tenantId: booking.tenantId,
      bookingId: args.bookingId,
      type: "completed",
      actorId: user._id,
    });

    await insertAuditLog(ctx, {
      tenantId: booking.tenantId,
      actorId: user._id,
      action: "booking.completed",
      resource: "bookings",
      resourceId: args.bookingId,
    });
  },
});

export const markNoShow = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const { user } = await requireRole(ctx, booking.tenantId, [
      "admin",
      "staff",
    ]);

    if (booking.status !== "confirmed") {
      throw new Error("Only confirmed bookings can be marked as no-show");
    }

    await ctx.db.patch(args.bookingId, {
      status: "no_show",
      updatedAt: Date.now(),
    });

    await insertBookingEvent(ctx, {
      tenantId: booking.tenantId,
      bookingId: args.bookingId,
      type: "no_show",
      actorId: user._id,
    });

    await insertAuditLog(ctx, {
      tenantId: booking.tenantId,
      actorId: user._id,
      action: "booking.no_show",
      resource: "bookings",
      resourceId: args.bookingId,
    });
  },
});

export const autoCancelNoShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour past end time
    const confirmed = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "confirmed"),
          q.lt(q.field("endTime"), cutoff)
        )
      )
      .collect();

    for (const booking of confirmed) {
      await ctx.db.patch(booking._id, {
        status: "no_show",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookingEvents", {
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: "no_show",
        actorId: booking.customerId,
        metadata: { autoMarked: true },
        timestamp: Date.now(),
      });
    }

    return { processed: confirmed.length };
  },
});
