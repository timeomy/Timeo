import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    clerkOrgId: v.optional(v.string()), // deprecated: kept for data compat
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
    // e-Invoice taxpayer profile (LHDN MyInvois seller/supplier details)
    eInvoiceProfile: v.optional(
      v.object({
        taxpayerName: v.string(),
        tin: v.string(), // Tax Identification Number
        msicCode: v.string(), // Malaysia Standard Industrial Classification
        msicDescription: v.optional(v.string()),
        idType: v.union(
          v.literal("brn"), // Business Registration Number (SSM)
          v.literal("nric"),
          v.literal("passport"),
          v.literal("army")
        ),
        idNumber: v.string(),
        sstRegNo: v.optional(v.string()), // SST Registration Number
        tourismRegNo: v.optional(v.string()), // Tourism Tax Registration Number
        address: v.object({
          line1: v.string(),
          line2: v.optional(v.string()),
          line3: v.optional(v.string()),
          city: v.string(),
          state: v.string(),
          postcode: v.string(),
          country: v.string(), // ISO 3166-1 alpha-3 (e.g. "MYS")
        }),
        notificationEmail: v.string(),
        notificationPhone: v.string(),
        // LHDN MyInvois API credentials (for future auto-submission)
        lhdnClientId: v.optional(v.string()),
        lhdnClientSecret: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_ownerId", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_clerkOrgId", ["clerkOrgId"]),

  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_authId", ["authId"])
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
      v.literal("check_in"),
      v.literal("session_logged"),
      v.literal("credits_low"),
      v.literal("voucher_received"),
      v.literal("receipt"),
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

  // ─── WS Fitness: Check-ins & QR Codes ───────────────────────────────

  checkIns: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    method: v.union(
      v.literal("qr"),
      v.literal("nfc"),
      v.literal("manual")
    ),
    checkedInBy: v.optional(v.id("users")),
    timestamp: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_user", ["userId"])
    .index("by_tenant_date", ["tenantId", "timestamp"]),

  memberQrCodes: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    code: v.string(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_user", ["userId"])
    .index("by_code", ["code"]),

  // ─── WS Fitness: Session Packages & Credits ────────────────────────

  sessionPackages: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    sessionCount: v.number(),
    price: v.number(),
    currency: v.string(),
    serviceId: v.optional(v.id("services")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_active", ["tenantId", "isActive"]),

  sessionCredits: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    packageId: v.id("sessionPackages"),
    totalSessions: v.number(),
    usedSessions: v.number(),
    expiresAt: v.optional(v.number()),
    purchasedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_user", ["userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  // ─── WS Fitness: Session Logs (Coach Notes) ────────────────────────

  sessionLogs: defineTable({
    tenantId: v.id("tenants"),
    clientId: v.id("users"),
    coachId: v.id("users"),
    bookingId: v.optional(v.id("bookings")),
    creditId: v.optional(v.id("sessionCredits")),
    sessionType: v.union(
      v.literal("personal_training"),
      v.literal("group_class"),
      v.literal("assessment"),
      v.literal("consultation")
    ),
    notes: v.optional(v.string()),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    metrics: v.optional(
      v.object({
        weight: v.optional(v.number()),
        bodyFat: v.optional(v.number()),
        heartRate: v.optional(v.number()),
        bloodPressure: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_client", ["clientId"])
    .index("by_coach", ["coachId"])
    .index("by_tenant_client", ["tenantId", "clientId"]),

  // ─── Vouchers ────────────────────────────────────────────────────────

  vouchers: defineTable({
    tenantId: v.id("tenants"),
    code: v.string(),
    type: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("free_session")
    ),
    value: v.number(),
    maxUses: v.optional(v.number()),
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    // Partner / distribution fields
    source: v.optional(
      v.union(
        v.literal("internal"),
        v.literal("partner"),
        v.literal("public")
      )
    ),
    partnerName: v.optional(v.string()),
    partnerLogo: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_code", ["code"])
    .index("by_tenant_active", ["tenantId", "isActive"]),

  // ─── Gift Cards ─────────────────────────────────────────────────────

  giftCards: defineTable({
    tenantId: v.id("tenants"),
    code: v.string(),
    initialBalance: v.number(), // cents
    currentBalance: v.number(), // cents
    currency: v.string(),
    purchaserName: v.optional(v.string()),
    purchaserEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_code", ["code"])
    .index("by_tenant_status", ["tenantId", "status"]),

  giftCardTransactions: defineTable({
    giftCardId: v.id("giftCards"),
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("purchase"),
      v.literal("redemption"),
      v.literal("refund"),
      v.literal("topup")
    ),
    amount: v.number(), // cents (positive)
    balanceAfter: v.number(),
    posTransactionId: v.optional(v.id("posTransactions")),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_gift_card", ["giftCardId"])
    .index("by_tenant", ["tenantId"]),

  voucherRedemptions: defineTable({
    tenantId: v.id("tenants"),
    voucherId: v.id("vouchers"),
    userId: v.id("users"),
    discountAmount: v.number(),
    bookingId: v.optional(v.id("bookings")),
    orderId: v.optional(v.id("orders")),
    redeemedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_voucher", ["voucherId"])
    .index("by_user", ["userId"]),

  // ─── WS Fitness: POS Transactions ─────────────────────────────────

  posTransactions: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    staffId: v.id("users"),
    items: v.array(
      v.object({
        type: v.union(
          v.literal("membership"),
          v.literal("session_package"),
          v.literal("service"),
          v.literal("product")
        ),
        referenceId: v.string(),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    subtotal: v.number(),
    discount: v.number(),
    total: v.number(),
    currency: v.string(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("qr_pay"),
      v.literal("bank_transfer")
    ),
    voucherId: v.optional(v.id("vouchers")),
    status: v.union(
      v.literal("completed"),
      v.literal("voided"),
      v.literal("refunded")
    ),
    receiptNumber: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_customer", ["customerId"])
    .index("by_tenant_date", ["tenantId", "createdAt"])
    .index("by_receipt", ["receiptNumber"]),

  // ─── e-Invoice Requests ──────────────────────────────────────────

  eInvoiceRequests: defineTable({
    tenantId: v.id("tenants"),
    transactionId: v.id("posTransactions"),
    receiptNumber: v.string(),
    // Buyer details (filled by customer)
    buyerTin: v.string(), // Tax Identification Number
    buyerIdType: v.union(
      v.literal("nric"),
      v.literal("passport"),
      v.literal("brn"), // Business Registration Number
      v.literal("army")
    ),
    buyerIdValue: v.string(),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerPhone: v.optional(v.string()),
    buyerAddress: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postcode: v.string(),
      country: v.string(),
    }),
    buyerSstRegNo: v.optional(v.string()),
    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("rejected")
    ),
    submittedAt: v.optional(v.number()),
    lhdnSubmissionId: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_transaction", ["transactionId"])
    .index("by_receipt", ["receiptNumber"])
    .index("by_tenant_status", ["tenantId", "status"]),

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
