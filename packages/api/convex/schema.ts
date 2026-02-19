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
});
