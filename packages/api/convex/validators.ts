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
  v.literal("awaiting_payment"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("completed"),
  v.literal("cancelled")
);

// Payment enums
export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("refunded")
);

// Subscription enums
export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("incomplete")
);

// Stripe Connect account enums
export const stripeAccountStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("restricted")
);

// Membership interval
export const membershipIntervalValidator = v.union(
  v.literal("monthly"),
  v.literal("yearly")
);

// Notification enums
export const notificationTypeValidator = v.union(
  v.literal("booking_confirmed"),
  v.literal("booking_cancelled"),
  v.literal("booking_reminder"),
  v.literal("order_update"),
  v.literal("staff_invitation"),
  v.literal("payment_received"),
  v.literal("check_in"),
  v.literal("session_logged"),
  v.literal("credits_low"),
  v.literal("voucher_received"),
  v.literal("receipt"),
  v.literal("system")
);

export const pushPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android"),
  v.literal("web")
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
  doorCamera: v.optional(
    v.object({
      ip: v.string(),
      port: v.optional(v.number()),
      gpioPort: v.optional(v.number()),
      deviceSn: v.optional(v.string()),
    })
  ),
});

export const tenantBrandingValidator = v.object({
  primaryColor: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  businessName: v.optional(v.string()),
});

// File type
export const fileTypeValidator = v.union(
  v.literal("product_image"),
  v.literal("service_image"),
  v.literal("avatar"),
  v.literal("logo"),
  v.literal("document")
);

// ─── WS Fitness validators ──────────────────────────────────────────

// Check-in method
export const checkInMethodValidator = v.union(
  v.literal("qr"),
  v.literal("nfc"),
  v.literal("manual")
);

// Session log type
export const sessionTypeValidator = v.union(
  v.literal("personal_training"),
  v.literal("group_class"),
  v.literal("assessment"),
  v.literal("consultation")
);

// Voucher type
export const voucherTypeValidator = v.union(
  v.literal("percentage"),
  v.literal("fixed"),
  v.literal("free_session")
);

// Exercise entry (used in session logs)
export const exerciseEntryValidator = v.object({
  name: v.string(),
  sets: v.optional(v.number()),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  duration: v.optional(v.number()),
  notes: v.optional(v.string()),
});

// Body metrics (used in session logs)
export const bodyMetricsValidator = v.object({
  weight: v.optional(v.number()),
  bodyFat: v.optional(v.number()),
  heartRate: v.optional(v.number()),
  bloodPressure: v.optional(v.string()),
  notes: v.optional(v.string()),
});

// POS payment method
export const posPaymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("qr_pay"),
  v.literal("bank_transfer")
);

// POS transaction status
export const posTransactionStatusValidator = v.union(
  v.literal("completed"),
  v.literal("voided"),
  v.literal("refunded")
);

// POS item type
export const posItemTypeValidator = v.union(
  v.literal("membership"),
  v.literal("session_package"),
  v.literal("service"),
  v.literal("product")
);

export const paginationValidator = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
