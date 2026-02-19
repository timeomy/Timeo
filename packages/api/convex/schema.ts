import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    plan: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("trial")
    ),
    settings: v.object({
      timezone: v.optional(v.string()),
      businessHours: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        })
      ),
      bookingBuffer: v.optional(v.number()),
      autoConfirmBookings: v.optional(v.boolean()),
    }),
    branding: v.object({
      primaryColor: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      businessName: v.optional(v.string()),
    }),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_ownerId", ["ownerId"])
    .index("by_status", ["status"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  tenantMemberships: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    role: v.union(
      v.literal("customer"),
      v.literal("staff"),
      v.literal("admin"),
      v.literal("platform_admin")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("suspended")
    ),
    joinedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_user", ["userId"])
    .index("by_tenant_role", ["tenantId", "role"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  services: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_active", ["tenantId", "isActive"]),

  bookings: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    serviceId: v.id("services"),
    staffId: v.optional(v.id("users")),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_customer", ["customerId"])
    .index("by_staff", ["staffId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_date", ["tenantId", "startTime"]),

  bookingEvents: defineTable({
    tenantId: v.id("tenants"),
    bookingId: v.id("bookings"),
    type: v.union(
      v.literal("created"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("no_show"),
      v.literal("rescheduled"),
      v.literal("note_added")
    ),
    actorId: v.id("users"),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_booking", ["bookingId"]),

  products: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_active", ["tenantId", "isActive"]),

  orders: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("awaiting_payment"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    totalAmount: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_customer", ["customerId"])
    .index("by_tenant_status", ["tenantId", "status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    quantity: v.number(),
    snapshotPrice: v.number(),
    snapshotName: v.string(),
  }).index("by_order", ["orderId"]),

  memberships: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    interval: v.union(v.literal("monthly"), v.literal("yearly")),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  platformConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  featureFlags: defineTable({
    key: v.string(),
    tenantId: v.optional(v.id("tenants")),
    enabled: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_key", ["key"])
    .index("by_tenant", ["tenantId"]),

  auditLogs: defineTable({
    tenantId: v.optional(v.id("tenants")),
    actorId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_actor", ["actorId"]),

  staffAvailability: defineTable({
    staffId: v.id("users"),
    tenantId: v.id("tenants"),
    dayOfWeek: v.number(), // 0-6, 0=Sunday
    startTime: v.string(), // "HH:mm"
    endTime: v.string(), // "HH:mm"
    isAvailable: v.boolean(),
  })
    .index("by_staff", ["staffId"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_day", ["tenantId", "dayOfWeek"]),

  businessHours: defineTable({
    tenantId: v.id("tenants"),
    dayOfWeek: v.number(), // 0-6, 0=Sunday
    openTime: v.string(), // "HH:mm"
    closeTime: v.string(), // "HH:mm"
    isOpen: v.boolean(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_day", ["tenantId", "dayOfWeek"]),

  blockedSlots: defineTable({
    tenantId: v.id("tenants"),
    staffId: v.optional(v.id("users")),
    startTime: v.number(), // unix ms
    endTime: v.number(), // unix ms
    reason: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_staff", ["staffId"])
    .index("by_tenant_daterange", ["tenantId", "startTime"]),

  payments: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    bookingId: v.optional(v.id("bookings")),
    stripePaymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_customer", ["customerId"])
    .index("by_order", ["orderId"])
    .index("by_booking", ["bookingId"])
    .index("by_stripe_pi", ["stripePaymentIntentId"]),

  subscriptions: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    membershipId: v.id("memberships"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_customer", ["customerId"])
    .index("by_membership", ["membershipId"])
    .index("by_stripe_sub", ["stripeSubscriptionId"]),

  stripeAccounts: defineTable({
    tenantId: v.id("tenants"),
    stripeAccountId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted")
    ),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    createdAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  notifications: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("booking_confirmed"),
      v.literal("booking_cancelled"),
      v.literal("booking_reminder"),
      v.literal("order_update"),
      v.literal("staff_invitation"),
      v.literal("payment_received"),
      v.literal("system")
    ),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"])
    .index("by_tenant", ["tenantId"]),

  notificationPreferences: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    emailBookingConfirm: v.boolean(),
    emailBookingReminder: v.boolean(),
    emailOrderUpdate: v.boolean(),
    pushEnabled: v.boolean(),
    inAppEnabled: v.boolean(),
  }).index("by_user_tenant", ["userId", "tenantId"]),

  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(
      v.literal("ios"),
      v.literal("android"),
      v.literal("web")
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  files: defineTable({
    tenantId: v.optional(v.id("tenants")),
    uploadedBy: v.id("users"),
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(), // bytes
    type: v.union(
      v.literal("product_image"),
      v.literal("service_image"),
      v.literal("avatar"),
      v.literal("logo"),
      v.literal("document")
    ),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_entity", ["type", "entityId"])
    .index("by_uploader", ["uploadedBy"]),
});
