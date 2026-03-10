import { z } from "zod";

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  staffId: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Services ─────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().int().min(0),
  currency: z.string().length(3).default("MYR"),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  price: z.number().int().min(0),
  currency: z.string().length(3).default("MYR"),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sku: z.string().max(100).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  notes: z.string().optional(),
});

// ─── POS ──────────────────────────────────────────────────────────────────────

export const CreatePosTransactionSchema = z.object({
  customerId: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  items: z
    .array(
      z.object({
        type: z.enum([
          "membership",
          "session_package",
          "service",
          "product",
        ]),
        referenceId: z.string().min(1),
        name: z.string().min(1),
        price: z.number().int().min(0),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  paymentMethod: z.enum([
    "cash",
    "card",
    "qr_pay",
    "bank_transfer",
    "revenue_monster",
  ]),
  voucherId: z.string().optional(),
  discount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// ─── Vouchers ─────────────────────────────────────────────────────────────────

export const CreateVoucherSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  type: z.enum(["percentage", "fixed", "free_session"]),
  value: z.number().min(0),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  source: z.enum(["internal", "partner", "public"]).default("internal"),
  partnerName: z.string().optional(),
  description: z.string().optional(),
});

// ─── Update Voucher ──────────────────────────────────────────────────────

export const UpdateVoucherSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  value: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// ─── Stock Adjustment ────────────────────────────────────────────────────

export const AdjustStockSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1).max(500),
});

// ─── Customer CRM ────────────────────────────────────────────────────────

export const UpdateCustomerSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ─── Loyalty ─────────────────────────────────────────────────────────────

export const EarnPointsSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().min(1),
  note: z.string().optional(),
});

export const RedeemPointsSchema = z.object({
  points: z.number().int().min(1),
  orderId: z.string().optional(),
});

// ─── Gift Cards ───────────────────────────────────────────────────────────────

export const CreateGiftCardSchema = z.object({
  initialBalance: z.number().int().min(100),
  currency: z.string().length(3).default("MYR"),
  purchaserName: z.string().optional(),
  purchaserEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const CreateSessionLogSchema = z.object({
  clientId: z.string().min(1),
  bookingId: z.string().optional(),
  creditId: z.string().optional(),
  sessionType: z.enum([
    "personal_training",
    "group_class",
    "assessment",
    "consultation",
  ]),
  notes: z.string().optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1),
        sets: z.number().int().optional(),
        reps: z.number().int().optional(),
        weight: z.number().optional(),
        duration: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .default([]),
  metrics: z
    .object({
      weight: z.number().optional(),
      bodyFat: z.number().optional(),
      heartRate: z.number().optional(),
      bloodPressure: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const UpdateTenantSettingsSchema = z.object({
  timezone: z.string().optional(),
  bookingBuffer: z.number().int().min(0).optional(),
  autoConfirmBookings: z.boolean().optional(),
  paymentGateway: z.enum(["stripe", "revenue_monster", "both"]).optional(),
});

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const InviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["staff", "admin"]),
});

export const AddTenantMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["customer", "staff", "admin"]),
  notes: z.string().max(500).optional(),
});

// ─── Memberships ──────────────────────────────────────────────────────────────

export const CreateMembershipPlanSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  price: z.number().int().min(0),
  currency: z.string().length(3).default("MYR"),
  interval: z.enum(["monthly", "yearly"]),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// ─── Check-ins ────────────────────────────────────────────────────────────────

export const CreateCheckInSchema = z.object({
  userId: z.string().min(1),
  method: z.enum(["qr", "nfc", "manual"]),
});

// ─── Scheduling ───────────────────────────────────────────────────────────────

export const SetStaffAvailabilitySchema = z.object({
  staffId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/),
  isAvailable: z.boolean().default(true),
});

export const SetBusinessHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/),
  closeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean().default(true),
});

export const CreateBlockedSlotSchema = z.object({
  staffId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().min(1),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const MarkNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

// ─── e-Invoice ────────────────────────────────────────────────────────────────

export const CreateEInvoiceSchema = z.object({
  transactionId: z.string().min(1),
  receiptNumber: z.string().min(1),
  buyerTin: z.string().min(1),
  buyerIdType: z.enum(["nric", "passport", "brn", "army"]),
  buyerIdValue: z.string().min(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().optional(),
  buyerAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default("MY"),
  }),
  buyerSstRegNo: z.string().optional(),
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const ExportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Files ────────────────────────────────────────────────────────────────────

export const CreateFileMetadataSchema = z.object({
  storageId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(0),
  type: z.enum([
    "product_image",
    "service_image",
    "avatar",
    "logo",
    "document",
  ]),
  entityId: z.string().optional(),
});
