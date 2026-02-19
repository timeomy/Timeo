import { v } from "convex/values";

// Tenant enums
export const tenantPlanValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("pro"),
  v.literal("enterprise")
);

export const tenantStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("trial")
);

// Member enums
export const memberRoleValidator = v.union(
  v.literal("customer"),
  v.literal("staff"),
  v.literal("admin"),
  v.literal("platform_admin")
);

export const membershipStatusValidator = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("suspended")
);

// Booking enums
export const bookingStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show")
);

export const bookingEventTypeValidator = v.union(
  v.literal("created"),
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("no_show"),
  v.literal("rescheduled"),
  v.literal("note_added")
);

// Order enums
export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("completed"),
  v.literal("cancelled")
);

// Membership interval
export const membershipIntervalValidator = v.union(
  v.literal("monthly"),
  v.literal("yearly")
);

// Common input shapes
export const tenantSettingsValidator = v.object({
  timezone: v.optional(v.string()),
  businessHours: v.optional(
    v.object({
      open: v.string(),
      close: v.string(),
    })
  ),
  bookingBuffer: v.optional(v.number()),
  autoConfirmBookings: v.optional(v.boolean()),
});

export const tenantBrandingValidator = v.object({
  primaryColor: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  businessName: v.optional(v.string()),
});

export const paginationValidator = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
