import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse "HH:mm" to minutes since midnight. */
function parseHHmm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Get start-of-day (midnight) for a unix-ms timestamp in a timezone. */
function getStartOfDay(timestampMs: number, timezone: string): number {
  const midnightLocal = new Date(
    new Date(timestampMs).toLocaleString("en-US", { timeZone: timezone })
  );
  midnightLocal.setHours(0, 0, 0, 0);
  // Convert back: the difference between local interpretation and UTC
  const utcEquivalent = new Date(
    new Date(timestampMs).toLocaleString("en-US", { timeZone: "UTC" })
  );
  const localEquivalent = new Date(
    new Date(timestampMs).toLocaleString("en-US", { timeZone: timezone })
  );
  const offset = utcEquivalent.getTime() - localEquivalent.getTime();
  return midnightLocal.getTime() + offset;
}

/** Get day of week (0=Sunday) for a timestamp in a timezone. */
function getDayOfWeek(timestampMs: number, timezone: string): number {
  const d = new Date(timestampMs);
  const dayStr = d.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[dayStr] ?? 0;
}

// ── Queries ──────────────────────────────────────────────────────────

export const getBusinessHours = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId);

    const hours = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Return all 7 days, filling in defaults for missing days
    const result = [];
    for (let day = 0; day < 7; day++) {
      const existing = hours.find((h) => h.dayOfWeek === day);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          _id: null,
          tenantId: args.tenantId,
          dayOfWeek: day,
          openTime: "09:00",
          closeTime: "17:00",
          isOpen: day >= 1 && day <= 5, // Mon-Fri open by default
        });
      }
    }
    return result;
  },
});

export const getStaffAvailability = query({
  args: { tenantId: v.id("tenants"), staffId: v.id("users") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId);

    const availability = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const filtered = availability.filter(
      (a) => a.tenantId === args.tenantId
    );

    // Return all 7 days, filling in defaults for missing days
    const result = [];
    for (let day = 0; day < 7; day++) {
      const existing = filtered.find((a) => a.dayOfWeek === day);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          _id: null,
          staffId: args.staffId,
          tenantId: args.tenantId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: day >= 1 && day <= 5,
        });
      }
    }
    return result;
  },
});

export const getAvailableSlots = query({
  args: {
    tenantId: v.id("tenants"),
    serviceId: v.id("services"),
    date: v.number(), // unix ms — any time on the desired date
    staffId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId);

    // 1. Get service for duration
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.tenantId !== args.tenantId || !service.isActive) {
      return [];
    }

    // 2. Get tenant for timezone + buffer
    const tenant = await ctx.db.get(args.tenantId);
    const timezone = tenant?.settings?.timezone ?? "Asia/Kuala_Lumpur";
    const bufferMinutes = tenant?.settings?.bookingBuffer ?? 0;
    const slotDurationMs =
      (service.durationMinutes + bufferMinutes) * 60 * 1000;
    const serviceDurationMs = service.durationMinutes * 60 * 1000;

    // 3. Calculate day boundaries in the tenant's timezone
    const dayOfWeek = getDayOfWeek(args.date, timezone);
    const dayStart = getStartOfDay(args.date, timezone);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // 4. Get business hours for this day
    const businessHours = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant_day", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", dayOfWeek)
      )
      .unique();

    // Default business hours if not set: Mon-Fri 09:00-17:00
    const isOpen = businessHours
      ? businessHours.isOpen
      : dayOfWeek >= 1 && dayOfWeek <= 5;
    if (!isOpen) return [];

    const openMinutes = businessHours
      ? parseHHmm(businessHours.openTime)
      : 9 * 60;
    const closeMinutes = businessHours
      ? parseHHmm(businessHours.closeTime)
      : 17 * 60;

    const businessOpenMs = dayStart + openMinutes * 60 * 1000;
    const businessCloseMs = dayStart + closeMinutes * 60 * 1000;

    // 5. Get staff members for this service (all staff in the tenant, or specific)
    let staffMembers: Array<{ userId: string; userName: string }> = [];
    if (args.staffId) {
      const user = await ctx.db.get(args.staffId);
      if (user) {
        staffMembers = [{ userId: user._id, userName: user.name }];
      }
    } else {
      // Get all active staff members for this tenant
      const memberships = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_role", (q) =>
          q.eq("tenantId", args.tenantId).eq("role", "staff")
        )
        .collect();

      const activeMemberships = memberships.filter(
        (m) => m.status === "active"
      );

      // Also include admins as potential staff
      const adminMemberships = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_role", (q) =>
          q.eq("tenantId", args.tenantId).eq("role", "admin")
        )
        .collect();

      const allStaff = [
        ...activeMemberships,
        ...adminMemberships.filter((m) => m.status === "active"),
      ];

      staffMembers = await Promise.all(
        allStaff.map(async (m) => {
          const user = await ctx.db.get(m.userId);
          return { userId: m.userId, userName: user?.name ?? "Staff" };
        })
      );
    }

    if (staffMembers.length === 0) return [];

    // 6. Get existing bookings for this date range
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant_date", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("startTime", dayStart)
          .lt("startTime", dayEnd)
      )
      .collect();

    const activeBookings = existingBookings.filter(
      (b) => b.status !== "cancelled"
    );

    // 7. Get blocked slots for this date range
    const blockedSlots = await ctx.db
      .query("blockedSlots")
      .withIndex("by_tenant_daterange", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("startTime", dayStart)
          .lt("startTime", dayEnd)
      )
      .collect();

    // 8. For each staff member, compute available slots
    const allSlots: Array<{
      startTime: number;
      endTime: number;
      staffId: string;
      staffName: string;
    }> = [];

    const now = Date.now();

    for (const staff of staffMembers) {
      // Get staff availability for this day
      const staffAvail = await ctx.db
        .query("staffAvailability")
        .withIndex("by_staff", (q) => q.eq("staffId", staff.userId as any))
        .collect();

      const dayAvail = staffAvail.find(
        (a) => a.tenantId === args.tenantId && a.dayOfWeek === dayOfWeek
      );

      // Default: available Mon-Fri 09:00-17:00
      const staffIsAvailable = dayAvail
        ? dayAvail.isAvailable
        : dayOfWeek >= 1 && dayOfWeek <= 5;
      if (!staffIsAvailable) continue;

      const staffStartMinutes = dayAvail
        ? parseHHmm(dayAvail.startTime)
        : 9 * 60;
      const staffEndMinutes = dayAvail
        ? parseHHmm(dayAvail.endTime)
        : 17 * 60;

      const staffStartMs = dayStart + staffStartMinutes * 60 * 1000;
      const staffEndMs = dayStart + staffEndMinutes * 60 * 1000;

      // Effective window = intersection of business hours and staff availability
      const windowStart = Math.max(businessOpenMs, staffStartMs);
      const windowEnd = Math.min(businessCloseMs, staffEndMs);

      if (windowEnd <= windowStart) continue;

      // Staff bookings and blocked slots
      const staffBookings = activeBookings.filter(
        (b) => b.staffId === staff.userId
      );
      const staffBlocked = blockedSlots.filter(
        (bs) => !bs.staffId || bs.staffId === staff.userId
      );

      // Generate candidate slots
      let cursor = windowStart;
      while (cursor + serviceDurationMs <= windowEnd) {
        const slotStart = cursor;
        const slotEnd = cursor + serviceDurationMs;

        // Skip slots in the past
        if (slotStart < now) {
          cursor += 30 * 60 * 1000; // advance by 30 min
          continue;
        }

        // Check for booking conflicts
        const hasBookingConflict = staffBookings.some(
          (b) => slotStart < b.endTime && slotEnd > b.startTime
        );

        // Check for blocked slot conflicts
        const hasBlockedConflict = staffBlocked.some(
          (bs) => slotStart < bs.endTime && slotEnd > bs.startTime
        );

        if (!hasBookingConflict && !hasBlockedConflict) {
          allSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            staffId: staff.userId,
            staffName: staff.userName,
          });
        }

        cursor += slotDurationMs; // advance by duration + buffer
      }
    }

    // Sort by startTime, then by staffName
    allSlots.sort((a, b) => a.startTime - b.startTime || a.staffName.localeCompare(b.staffName));

    return allSlots;
  },
});

export const getStaffSchedule = query({
  args: {
    tenantId: v.id("tenants"),
    staffId: v.id("users"),
    startDate: v.number(), // unix ms
    endDate: v.number(), // unix ms
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const rangeBookings = bookings.filter(
      (b) =>
        b.tenantId === args.tenantId &&
        b.startTime >= args.startDate &&
        b.startTime < args.endDate &&
        b.status !== "cancelled"
    );

    const enrichedBookings = await Promise.all(
      rangeBookings.map(async (b) => {
        const customer = await ctx.db.get(b.customerId);
        const service = await ctx.db.get(b.serviceId);
        return {
          ...b,
          customerName: customer?.name ?? "Unknown",
          serviceName: service?.name ?? "Unknown",
        };
      })
    );

    const blockedSlots = await ctx.db
      .query("blockedSlots")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const rangeBlocked = blockedSlots.filter(
      (bs) =>
        bs.tenantId === args.tenantId &&
        bs.startTime >= args.startDate &&
        bs.startTime < args.endDate
    );

    return {
      bookings: enrichedBookings,
      blockedSlots: rangeBlocked,
    };
  },
});

export const getBlockedSlots = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const blockedSlots = await ctx.db
      .query("blockedSlots")
      .withIndex("by_tenant_daterange", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("startTime", args.startDate)
          .lt("startTime", args.endDate)
      )
      .collect();

    return blockedSlots;
  },
});

// ── Mutations ────────────────────────────────────────────────────────

export const setBusinessHours = mutation({
  args: {
    tenantId: v.id("tenants"),
    hours: v.array(
      v.object({
        dayOfWeek: v.number(),
        openTime: v.string(),
        closeTime: v.string(),
        isOpen: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    // Delete existing business hours for this tenant
    const existing = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    for (const h of existing) {
      await ctx.db.delete(h._id);
    }

    // Insert new business hours
    for (const h of args.hours) {
      await ctx.db.insert("businessHours", {
        tenantId: args.tenantId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isOpen: h.isOpen,
      });
    }

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "business_hours.updated",
      resource: "businessHours",
      resourceId: args.tenantId,
    });
  },
});

export const setStaffAvailability = mutation({
  args: {
    tenantId: v.id("tenants"),
    staffId: v.id("users"),
    availability: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        isAvailable: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, [
      "admin",
      "staff",
    ]);

    // Staff can only edit their own availability
    if (
      user._id !== args.staffId &&
      !(await isAdmin(ctx, args.tenantId, user._id))
    ) {
      throw new Error("Not authorized to edit this staff member's availability");
    }

    // Delete existing availability for this staff+tenant
    const existing = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const tenantAvail = existing.filter(
      (a) => a.tenantId === args.tenantId
    );

    for (const a of tenantAvail) {
      await ctx.db.delete(a._id);
    }

    // Insert new availability
    for (const a of args.availability) {
      await ctx.db.insert("staffAvailability", {
        staffId: args.staffId,
        tenantId: args.tenantId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      });
    }

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "staff_availability.updated",
      resource: "staffAvailability",
      resourceId: args.staffId,
      metadata: { targetStaffId: args.staffId },
    });
  },
});

export const createBlockedSlot = mutation({
  args: {
    tenantId: v.id("tenants"),
    staffId: v.optional(v.id("users")),
    startTime: v.number(),
    endTime: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, [
      "admin",
      "staff",
    ]);

    if (args.startTime >= args.endTime) {
      throw new Error("Start time must be before end time");
    }

    const slotId = await ctx.db.insert("blockedSlots", {
      tenantId: args.tenantId,
      staffId: args.staffId,
      startTime: args.startTime,
      endTime: args.endTime,
      reason: args.reason,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "blocked_slot.created",
      resource: "blockedSlots",
      resourceId: slotId,
      metadata: {
        staffId: args.staffId,
        reason: args.reason,
      },
    });

    return slotId;
  },
});

export const deleteBlockedSlot = mutation({
  args: { blockedSlotId: v.id("blockedSlots") },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.blockedSlotId);
    if (!slot) throw new Error("Blocked slot not found");

    const { user } = await requireRole(ctx, slot.tenantId, [
      "admin",
      "staff",
    ]);

    await ctx.db.delete(args.blockedSlotId);

    await insertAuditLog(ctx, {
      tenantId: slot.tenantId,
      actorId: user._id,
      action: "blocked_slot.deleted",
      resource: "blockedSlots",
      resourceId: args.blockedSlotId,
      metadata: { reason: slot.reason },
    });
  },
});

// ── Internal helpers ─────────────────────────────────────────────────

async function isAdmin(
  ctx: any,
  tenantId: any,
  userId: any
): Promise<boolean> {
  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_user", (q: any) =>
      q.eq("tenantId", tenantId).eq("userId", userId)
    )
    .unique();
  return membership?.role === "admin" || membership?.role === "platform_admin";
}
