import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, generateId } from "@timeo/db";
import {
  checkIns,
  invoiceItems,
  invoices,
  memberships,
  paymentRequests,
  payments,
  subscriptions,
  tenantMemberships,
  turnstileEvents,
  turnstileFaceLogs,
  users,
} from "@timeo/db/schema";
import { authMiddleware } from "../middleware/auth.js";
import { requirePlatformAdmin } from "../middleware/rbac.js";
import { error, success } from "../lib/response.js";

const app = new Hono();

const WSFITNESS_TENANT_ID = "7Kw87VeAnXg4qDXi6UTbu";

const AVATAR_STORAGE_DIR =
  process.env.TIMEO_AVATAR_STORAGE_DIR ?? "/opt/timeo-website/avatars";
const AVATAR_PUBLIC_BASE_URL = (
  process.env.TIMEO_AVATAR_PUBLIC_BASE_URL ?? "https://timeo.my/avatars"
).replace(/\/$/, "");

const RECEIPT_STORAGE_DIR =
  process.env.TIMEO_RECEIPT_STORAGE_DIR ?? "/opt/timeo-website/receipts";
const RECEIPT_PUBLIC_BASE_URL = (
  process.env.TIMEO_RECEIPT_PUBLIC_BASE_URL ?? "https://timeo.my/receipts"
).replace(/\/$/, "");

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

type CounterKey =
  | "members"
  | "plans"
  | "memberships"
  | "payments"
  | "invoices"
  | "checkIns"
  | "turnstileEvents"
  | "turnstileFaceLogs"
  | "photos"
  | "receipts";

type ImportCounters = Record<CounterKey, number>;

type ImportError = {
  entity: CounterKey;
  externalId: string;
  message: string;
};

type BulkImportResult = {
  inserted: ImportCounters;
  updated: ImportCounters;
  errors: ImportError[];
};

type DbTx = any;

class BulkImportAbortError extends Error {
  constructor(
    message: string,
    readonly errors: ImportError[],
  ) {
    super(message);
    this.name = "BulkImportAbortError";
  }
}

const imageMimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const LegacyWsFitnessMemberSchema = z
  .object({
    externalId: z
      .union([z.string(), z.number()])
      .transform((value) => String(value).trim()),
    cardNo: z.string().optional().nullable(),
    legacyUserId: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((value) =>
        value === null || value === undefined ? null : String(value),
      ),
    name: z.string().min(1).max(200),
    email: z.string().email().optional().nullable(),
    planName: z.string().min(1).max(200),
    price: z.coerce.number().min(0),
    expiryDate: z.string().min(1),
    startDate: z.string().min(1).optional().nullable(),
    ticketType: z.string().optional().nullable(),
    personId: z.string().optional().nullable(),
    faceImageBase64: z.string().optional().nullable(),
  })
  .superRefine((member, ctx) => {
    if (!member.externalId) {
      ctx.addIssue({
        path: ["externalId"],
        code: z.ZodIssueCode.custom,
        message: "externalId is required",
      });
    }
  });

const LegacyWsFitnessPayloadSchema = z
  .array(LegacyWsFitnessMemberSchema)
  .min(1)
  .max(2000);

const WsFitnessMemberSchema = z.object({
  externalId: z.string().min(1),
  memberId: z.string().optional().nullable(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  nfcCardId: z.string().optional().nullable(),
  waiverSignature: z.string().optional().nullable(),
  waiverSignedAt: z.string().optional().nullable(),
  role: z.enum(["customer", "staff", "coach", "admin", "platform_admin"]).optional(),
  status: z.enum(["active", "invited", "suspended", "removed"]).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  joinedAt: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
});

const WsFitnessPlanSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  priceCents: z.coerce.number().int().min(0),
  interval: z.enum(["monthly", "yearly"]).optional().nullable(),
  durationMonths: z.coerce.number().int().min(0).optional().nullable(),
  durationDays: z.coerce.number().int().min(0).optional().nullable(),
  accessLevel: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().optional().nullable(),
  planType: z.string().optional().nullable(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional().nullable(),
});

const WsFitnessMembershipSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().min(1),
  planExternalId: z.string().min(1),
  status: z.enum(["active", "past_due", "canceled", "incomplete"]).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  pricePaidCents: z.coerce.number().int().min(0).optional().nullable(),
  createdAt: z.string().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  packageType: z.string().optional().nullable(),
  totalClasses: z.coerce.number().int().optional().nullable(),
  remainingClasses: z.coerce.number().int().optional().nullable(),
  carryOverSessions: z.coerce.number().int().optional().nullable(),
});

const WsFitnessPaymentSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().min(1),
  amountCents: z.coerce.number().int().min(0),
  currency: z.string().min(3).max(3).optional().nullable(),
  method: z.string().optional().nullable(),
  requestStatus: z.enum(["pending_verification", "approved", "rejected"]).optional(),
  paymentStatus: z
    .enum(["pending", "processing", "succeeded", "failed", "refunded"])
    .optional(),
  planReferenceType: z.enum(["membership", "session_package"]).optional(),
  planExternalId: z.string().optional().nullable(),
  planName: z.string().optional().nullable(),
  planDurationMonths: z.coerce.number().int().optional().nullable(),
  planSessionCount: z.coerce.number().int().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  payerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  adminNote: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
});

const WsFitnessInvoiceItemSchema = z.object({
  externalId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPriceCents: z.coerce.number().int().min(0),
  taxRateBasisPoints: z.coerce.number().int().optional().nullable(),
  taxAmountCents: z.coerce.number().int().optional().nullable(),
  totalCents: z.coerce.number().int().optional().nullable(),
  classificationCode: z.string().optional().nullable(),
});

const WsFitnessInvoiceSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().optional().nullable(),
  invoiceNumber: z.string().min(1),
  amountCents: z.coerce.number().int().min(0),
  subtotalCents: z.coerce.number().int().optional().nullable(),
  taxRateBasisPoints: z.coerce.number().int().optional().nullable(),
  taxAmountCents: z.coerce.number().int().optional().nullable(),
  totalAmountCents: z.coerce.number().int().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  items: z.array(WsFitnessInvoiceItemSchema).optional(),
});

const WsFitnessCheckInSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().min(1),
  timestamp: z.string().min(1),
  method: z.enum(["qr", "nfc", "manual", "face"]).optional(),
  gate: z.string().optional().nullable(),
  device: z.string().optional().nullable(),
  entryType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const WsFitnessTurnstileEventSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().optional().nullable(),
  receivedAt: z.string().optional().nullable(),
  deviceSn: z.string().optional().nullable(),
  cmd: z.string().optional().nullable(),
  sequenceNo: z.coerce.number().int().optional().nullable(),
  capTime: z.string().optional().nullable(),
  matchResult: z.string().optional().nullable(),
  matchFailedReason: z.string().optional().nullable(),
  personId: z.string().optional().nullable(),
  personName: z.string().optional().nullable(),
  customerText: z.string().optional().nullable(),
  rawPayload: z.unknown().optional(),
  isRejected: z.boolean().optional(),
  rejectReason: z.string().optional().nullable(),
});

const WsFitnessTurnstileFaceLogSchema = z.object({
  externalId: z.string().min(1),
  userExternalId: z.string().optional().nullable(),
  deviceSn: z.string().optional().nullable(),
  personId: z.string().optional().nullable(),
  capTime: z.string().optional().nullable(),
  decision: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  rawPayload: z.unknown().optional(),
  createdAt: z.string().optional().nullable(),
});

const WsFitnessBulkSchema = z
  .object({
    members: z.array(WsFitnessMemberSchema).max(1000).optional(),
    plans: z.array(WsFitnessPlanSchema).max(1000).optional(),
    memberships: z.array(WsFitnessMembershipSchema).max(1000).optional(),
    payments: z.array(WsFitnessPaymentSchema).max(1000).optional(),
    invoices: z.array(WsFitnessInvoiceSchema).max(1000).optional(),
    checkIns: z.array(WsFitnessCheckInSchema).max(2000).optional(),
    turnstileEvents: z.array(WsFitnessTurnstileEventSchema).max(2000).optional(),
    turnstileFaceLogs: z.array(WsFitnessTurnstileFaceLogSchema).max(2000).optional(),
    photos: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (payload) =>
      Boolean(
        payload.members?.length ||
          payload.plans?.length ||
          payload.memberships?.length ||
          payload.payments?.length ||
          payload.invoices?.length ||
          payload.checkIns?.length ||
          payload.turnstileEvents?.length ||
          payload.turnstileFaceLogs?.length ||
          Object.keys(payload.photos ?? {}).length,
      ),
    {
      message: "At least one non-empty import field is required",
      path: ["members"],
    },
  );

const WsFitnessMediaSchema = z.object({
  kind: z.enum(["avatar", "receipt"]),
  externalId: z.string().min(1),
  dataBase64: z.string().min(1),
});

function emptyCounters(): ImportCounters {
  return {
    members: 0,
    plans: 0,
    memberships: 0,
    payments: 0,
    invoices: 0,
    checkIns: 0,
    turnstileEvents: 0,
    turnstileFaceLogs: 0,
    photos: 0,
    receipts: 0,
  };
}

function normalizeEmail(email: string | null | undefined, externalId: string): string {
  if (email && email.trim()) {
    const value = email.trim().toLowerCase();
    if (value !== "unknown") {
      return value;
    }
  }
  return `wsfitness-${externalId}@import.timeo.local`;
}

function parseDateOrThrow(raw: string, field: string): Date {
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid ${field}: ${raw}`);
  }
  return value;
}

function parseDateOrNull(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
}

function sanitizeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function inferInterval(durationDays: number | null, durationMonths: number | null): "monthly" | "yearly" {
  if ((durationDays ?? 0) >= 365 || (durationMonths ?? 0) >= 12) {
    return "yearly";
  }
  return "monthly";
}

function decodeMediaData(base64OrDataUrl: string): {
  bytes: Buffer;
  extension: string;
} {
  let payload = base64OrDataUrl.trim();
  let mimeType = "image/jpeg";

  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(payload);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    payload = dataUrlMatch[2];
  }

  const normalizedBase64 = payload
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const bytes = Buffer.from(normalizedBase64, "base64");
  if (!bytes.length) {
    throw new Error("Media payload is empty after base64 decode");
  }
  if (bytes.length > MAX_MEDIA_BYTES) {
    throw new Error(`Media payload exceeds max allowed size (${MAX_MEDIA_BYTES} bytes)`);
  }

  const extension = imageMimeToExt[mimeType] ?? "jpg";

  return { bytes, extension };
}

async function persistMediaFile(params: {
  storageDir: string;
  baseUrl: string;
  prefix: string;
  externalId: string;
  base64: string;
}): Promise<string> {
  const { storageDir, baseUrl, prefix, externalId, base64 } = params;
  const { bytes, extension } = decodeMediaData(base64);
  const safeExternalId = sanitizeToken(externalId);
  const filename = `wsfitness-${prefix}-${safeExternalId}.${extension}`;

  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(path.join(storageDir, filename), bytes);

  return `${baseUrl}/${filename}`;
}

async function resolveUserIdByExternal(
  tx: DbTx,
  externalId: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(externalId)) {
    return cache.get(externalId)!;
  }

  const [membership] = await tx
    .select({ userId: tenantMemberships.user_id })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
        eq(tenantMemberships.external_id, externalId),
      ),
    )
    .limit(1);

  if (membership?.userId) {
    cache.set(externalId, membership.userId);
    return membership.userId;
  }

  const [fallback] = await tx
    .select({ userId: tenantMemberships.user_id })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
        eq(tenantMemberships.member_id, externalId),
      ),
    )
    .limit(1);

  if (fallback?.userId) {
    cache.set(externalId, fallback.userId);
    return fallback.userId;
  }

  throw new Error(`Member externalId not found: ${externalId}`);
}

async function resolvePlanIdByExternal(
  tx: DbTx,
  externalId: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(externalId)) {
    return cache.get(externalId)!;
  }

  const [plan] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.tenant_id, WSFITNESS_TENANT_ID),
        eq(memberships.external_id, externalId),
      ),
    )
    .limit(1);

  if (!plan) {
    throw new Error(`Plan externalId not found: ${externalId}`);
  }

  cache.set(externalId, plan.id);
  return plan.id;
}

async function upsertPlan(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessPlanSchema>,
  result: BulkImportResult,
  planCache: Map<string, string>,
) {
  const [existing] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.tenant_id, WSFITNESS_TENANT_ID),
        eq(memberships.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const durationMonths = payload.durationMonths ?? null;
  const durationDays = payload.durationDays ?? null;
  const interval = payload.interval ?? inferInterval(durationDays, durationMonths);

  const values = {
    tenant_id: WSFITNESS_TENANT_ID,
    external_id: payload.externalId,
    name: payload.name,
    description: payload.description ?? payload.name,
    price: payload.priceCents,
    currency: "MYR",
    interval,
    duration_months: durationMonths,
    duration_days: durationDays,
    access_level: payload.accessLevel ?? null,
    display_order: payload.displayOrder ?? null,
    plan_type: payload.planType ?? "all_access",
    features: payload.features?.length ? payload.features : ["Imported from WS Fitness"],
    is_active: payload.isActive ?? true,
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  if (existing) {
    await tx.update(memberships).set(values).where(eq(memberships.id, existing.id));
    result.updated.plans += 1;
    planCache.set(payload.externalId, existing.id);
    return;
  }

  const id = generateId();
  await tx.insert(memberships).values({ id, ...values });
  result.inserted.plans += 1;
  planCache.set(payload.externalId, id);
}

async function upsertMember(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessMemberSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  const [membershipByExternal] = await tx
    .select({
      id: tenantMemberships.id,
      userId: tenantMemberships.user_id,
    })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
        eq(tenantMemberships.external_id, payload.externalId),
      ),
    )
    .limit(1);

  let userId = membershipByExternal?.userId ?? null;
  const memberEmail = normalizeEmail(payload.email, payload.externalId);

  if (!userId) {
    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, memberEmail))
      .limit(1);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = generateId();
      await tx.insert(users).values({
        id: userId,
        auth_id: null,
        email: memberEmail,
        name: payload.name,
        avatar_url: payload.avatarUrl ?? null,
        phone: payload.phone ?? null,
        nfc_card_id: payload.nfcCardId ?? null,
        role: "user",
        created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
        updated_at: new Date(),
      });
    }
  }

  await tx
    .update(users)
    .set({
      email: memberEmail,
      name: payload.name,
      avatar_url: payload.avatarUrl ?? null,
      phone: payload.phone ?? null,
      nfc_card_id: payload.nfcCardId ?? null,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId));

  const membershipValues = {
    user_id: userId,
    tenant_id: WSFITNESS_TENANT_ID,
    role: payload.role ?? "customer",
    status: payload.status ?? "active",
    member_id: payload.memberId ?? null,
    external_id: payload.externalId,
    notes: payload.notes ?? null,
    tags: payload.tags ?? [],
    waiver_signature: payload.waiverSignature ?? null,
    waiver_signed_at: parseDateOrNull(payload.waiverSignedAt),
    joined_at: parseDateOrNull(payload.joinedAt) ?? parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  if (membershipByExternal) {
    await tx
      .update(tenantMemberships)
      .set(membershipValues)
      .where(eq(tenantMemberships.id, membershipByExternal.id));
    result.updated.members += 1;
  } else {
    await tx.insert(tenantMemberships).values({
      id: generateId(),
      ...membershipValues,
    });
    result.inserted.members += 1;
  }

  userCache.set(payload.externalId, userId);
}

async function upsertMembership(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessMembershipSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
  planCache: Map<string, string>,
) {
  const userId = await resolveUserIdByExternal(tx, payload.userExternalId, userCache);
  const planId = await resolvePlanIdByExternal(tx, payload.planExternalId, planCache);

  const [existing] = await tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenant_id, WSFITNESS_TENANT_ID),
        eq(subscriptions.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const values = {
    tenant_id: WSFITNESS_TENANT_ID,
    customer_id: userId,
    membership_id: planId,
    external_id: payload.externalId,
    status: payload.status ?? "active",
    current_period_start: parseDateOrThrow(payload.startDate, "startDate"),
    current_period_end: parseDateOrThrow(payload.endDate, "endDate"),
    cancel_at_period_end:
      payload.cancelAtPeriodEnd ?? (payload.status ?? "active") === "canceled",
    price_paid: payload.pricePaidCents ?? null,
    package_type: payload.packageType ?? "membership",
    total_classes: payload.totalClasses ?? null,
    remaining_classes: payload.remainingClasses ?? null,
    carry_over_sessions: payload.carryOverSessions ?? 0,
    updated_at: new Date(),
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  if (existing) {
    await tx.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
    result.updated.memberships += 1;
    return;
  }

  await tx.insert(subscriptions).values({
    id: generateId(),
    ...values,
  });
  result.inserted.memberships += 1;
}

async function upsertPayment(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessPaymentSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
  planCache: Map<string, string>,
) {
  const userId = await resolveUserIdByExternal(tx, payload.userExternalId, userCache);

  let planId: string | null = null;
  if (payload.planExternalId) {
    planId = await resolvePlanIdByExternal(tx, payload.planExternalId, planCache);
  }

  const requestStatus = payload.requestStatus ?? "pending_verification";
  const paymentStatus =
    payload.paymentStatus ??
    (requestStatus === "approved"
      ? "succeeded"
      : requestStatus === "rejected"
        ? "failed"
        : "pending");

  const [existingRequest] = await tx
    .select({ id: paymentRequests.id })
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.tenant_id, WSFITNESS_TENANT_ID),
        eq(paymentRequests.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const requestValues = {
    tenant_id: WSFITNESS_TENANT_ID,
    customer_id: userId,
    external_id: payload.externalId,
    plan_id: planId,
    plan_reference_type: payload.planReferenceType ?? "membership",
    plan_name: payload.planName ?? "Imported plan",
    plan_duration_months: payload.planDurationMonths ?? null,
    plan_session_count: payload.planSessionCount ?? null,
    amount: payload.amountCents,
    currency: (payload.currency ?? "MYR").toUpperCase(),
    receipt_url: payload.receiptUrl ?? null,
    status: requestStatus,
    member_note: payload.notes ?? null,
    admin_note: payload.adminNote ?? null,
    approved_by: null,
    approved_at:
      requestStatus === "approved"
        ? parseDateOrNull(payload.paymentDate) ?? new Date()
        : null,
    rejected_at:
      requestStatus === "rejected"
        ? parseDateOrNull(payload.paymentDate) ?? new Date()
        : null,
    subscription_id: null,
    session_credit_id: null,
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
    updated_at: new Date(),
  };

  if (existingRequest) {
    await tx
      .update(paymentRequests)
      .set(requestValues)
      .where(eq(paymentRequests.id, existingRequest.id));
  } else {
    await tx.insert(paymentRequests).values({
      id: generateId(),
      ...requestValues,
    });
  }

  const [existingPayment] = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.tenant_id, WSFITNESS_TENANT_ID),
        eq(payments.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const paymentValues = {
    tenant_id: WSFITNESS_TENANT_ID,
    customer_id: userId,
    external_id: payload.externalId,
    amount: payload.amountCents,
    currency: (payload.currency ?? "MYR").toUpperCase(),
    status: paymentStatus,
    method: payload.method ?? null,
    receipt_url: payload.receiptUrl ?? null,
    metadata: {
      source: "wsfitness",
      orderId: payload.orderId ?? null,
      payerName: payload.payerName ?? null,
      planName: payload.planName ?? null,
      notes: payload.notes ?? null,
    },
    rm_order_id: payload.orderId ?? null,
    updated_at: new Date(),
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  if (existingPayment) {
    await tx
      .update(payments)
      .set(paymentValues)
      .where(eq(payments.id, existingPayment.id));
    result.updated.payments += 1;
    return;
  }

  await tx.insert(payments).values({
    id: generateId(),
    ...paymentValues,
  });
  result.inserted.payments += 1;
}

async function upsertInvoice(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessInvoiceSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  const userId = payload.userExternalId
    ? await resolveUserIdByExternal(tx, payload.userExternalId, userCache)
    : null;

  const [existingInvoice] = await tx
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenant_id, WSFITNESS_TENANT_ID),
        eq(invoices.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const itemSnapshots: Array<Record<string, unknown>> = [];
  for (const item of payload.items ?? []) {
    itemSnapshots.push({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      taxRateBasisPoints: item.taxRateBasisPoints ?? null,
      taxAmountCents: item.taxAmountCents ?? null,
      totalCents: item.totalCents ?? null,
      classificationCode: item.classificationCode ?? null,
    });
  }

  const invoiceValues = {
    tenant_id: WSFITNESS_TENANT_ID,
    user_id: userId,
    external_id: payload.externalId,
    invoice_number: payload.invoiceNumber,
    amount: payload.amountCents,
    subtotal: payload.subtotalCents ?? null,
    tax_rate: payload.taxRateBasisPoints ?? null,
    tax_amount: payload.taxAmountCents ?? null,
    total_amount: payload.totalAmountCents ?? payload.amountCents,
    currency: (payload.currency ?? "MYR").toUpperCase(),
    status: payload.status ?? "draft",
    notes: payload.notes ?? null,
    issue_date: parseDateOrNull(payload.issueDate),
    due_date: parseDateOrNull(payload.dueDate),
    payment_method: payload.paymentMethod ?? null,
    source: payload.source ?? "wsfitness",
    items: itemSnapshots,
    updated_at: new Date(),
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  let invoiceId: string;
  if (existingInvoice) {
    invoiceId = existingInvoice.id;
    await tx.update(invoices).set(invoiceValues).where(eq(invoices.id, invoiceId));
    result.updated.invoices += 1;
  } else {
    invoiceId = generateId();
    await tx.insert(invoices).values({
      id: invoiceId,
      ...invoiceValues,
    });
    result.inserted.invoices += 1;
  }

  for (let index = 0; index < (payload.items?.length ?? 0); index += 1) {
    const item = payload.items![index];
    const externalId = item.externalId ?? `${payload.externalId}:${index}`;

    const [existingItem] = await tx
      .select({ id: invoiceItems.id })
      .from(invoiceItems)
      .where(
        and(
          eq(invoiceItems.tenant_id, WSFITNESS_TENANT_ID),
          eq(invoiceItems.external_id, externalId),
        ),
      )
      .limit(1);

    const itemValues = {
      tenant_id: WSFITNESS_TENANT_ID,
      invoice_id: invoiceId,
      external_id: externalId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPriceCents,
      tax_rate: item.taxRateBasisPoints ?? null,
      tax_amount: item.taxAmountCents ?? null,
      total: item.totalCents ?? item.unitPriceCents * item.quantity,
      classification_code: item.classificationCode ?? null,
    };

    if (existingItem) {
      await tx.update(invoiceItems).set(itemValues).where(eq(invoiceItems.id, existingItem.id));
      continue;
    }

    await tx.insert(invoiceItems).values({
      id: generateId(),
      ...itemValues,
    });
  }
}

async function upsertCheckIn(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessCheckInSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  const userId = await resolveUserIdByExternal(tx, payload.userExternalId, userCache);

  const [existing] = await tx
    .select({ id: checkIns.id })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.tenant_id, WSFITNESS_TENANT_ID),
        eq(checkIns.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const values = {
    tenant_id: WSFITNESS_TENANT_ID,
    user_id: userId,
    external_id: payload.externalId,
    method: payload.method ?? "manual",
    gate: payload.gate ?? null,
    device: payload.device ?? null,
    entry_type: payload.entryType ?? null,
    notes: payload.notes ?? null,
    timestamp: parseDateOrThrow(payload.timestamp, "timestamp"),
  };

  if (existing) {
    await tx.update(checkIns).set(values).where(eq(checkIns.id, existing.id));
    result.updated.checkIns += 1;
    return;
  }

  await tx.insert(checkIns).values({
    id: generateId(),
    ...values,
  });
  result.inserted.checkIns += 1;
}

async function upsertTurnstileEvent(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessTurnstileEventSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  let userExternalData: string | null = null;
  if (payload.userExternalId) {
    try {
      userExternalData = await resolveUserIdByExternal(tx, payload.userExternalId, userCache);
    } catch {
      userExternalData = null;
    }
  }

  const [existing] = await tx
    .select({ id: turnstileEvents.id })
    .from(turnstileEvents)
    .where(
      and(
        eq(turnstileEvents.tenant_id, WSFITNESS_TENANT_ID),
        eq(turnstileEvents.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const values = {
    tenant_id: WSFITNESS_TENANT_ID,
    external_id: payload.externalId,
    received_at: parseDateOrNull(payload.receivedAt),
    device_sn: payload.deviceSn ?? null,
    cmd: payload.cmd ?? null,
    sequence_no: payload.sequenceNo ?? null,
    cap_time: payload.capTime ?? null,
    match_result: payload.matchResult ?? null,
    match_failed_reason: payload.matchFailedReason ?? null,
    person_id: payload.personId ?? null,
    person_name: payload.personName ?? null,
    customer_text:
      payload.customerText ??
      (userExternalData ? `user_id=${userExternalData}` : null),
    raw_payload: payload.rawPayload ?? null,
    is_rejected: payload.isRejected ?? false,
    reject_reason: payload.rejectReason ?? null,
  };

  if (existing) {
    await tx
      .update(turnstileEvents)
      .set(values)
      .where(eq(turnstileEvents.id, existing.id));
    result.updated.turnstileEvents += 1;
    return;
  }

  await tx.insert(turnstileEvents).values({
    id: generateId(),
    ...values,
  });
  result.inserted.turnstileEvents += 1;
}

async function upsertTurnstileFaceLog(
  tx: DbTx,
  payload: z.infer<typeof WsFitnessTurnstileFaceLogSchema>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  let userId: string | null = null;
  if (payload.userExternalId) {
    try {
      userId = await resolveUserIdByExternal(tx, payload.userExternalId, userCache);
    } catch {
      userId = null;
    }
  }

  const [existing] = await tx
    .select({ id: turnstileFaceLogs.id })
    .from(turnstileFaceLogs)
    .where(
      and(
        eq(turnstileFaceLogs.tenant_id, WSFITNESS_TENANT_ID),
        eq(turnstileFaceLogs.external_id, payload.externalId),
      ),
    )
    .limit(1);

  const values = {
    tenant_id: WSFITNESS_TENANT_ID,
    external_id: payload.externalId,
    device_sn: payload.deviceSn ?? null,
    user_id: userId,
    person_id: payload.personId ?? null,
    cap_time: payload.capTime ?? null,
    decision: payload.decision ?? null,
    reason: payload.reason ?? null,
    raw_payload: payload.rawPayload ?? null,
    created_at: parseDateOrNull(payload.createdAt) ?? new Date(),
  };

  if (existing) {
    await tx
      .update(turnstileFaceLogs)
      .set(values)
      .where(eq(turnstileFaceLogs.id, existing.id));
    result.updated.turnstileFaceLogs += 1;
    return;
  }

  await tx.insert(turnstileFaceLogs).values({
    id: generateId(),
    ...values,
  });
  result.inserted.turnstileFaceLogs += 1;
}

async function importPhotosMap(
  tx: DbTx,
  photos: Record<string, string>,
  result: BulkImportResult,
  userCache: Map<string, string>,
) {
  for (const [externalId, base64] of Object.entries(photos)) {
    const userId = await resolveUserIdByExternal(tx, externalId, userCache);
    const avatarUrl = await persistMediaFile({
      storageDir: AVATAR_STORAGE_DIR,
      baseUrl: AVATAR_PUBLIC_BASE_URL,
      prefix: "avatar",
      externalId,
      base64,
    });

    await tx
      .update(users)
      .set({
        avatar_url: avatarUrl,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    result.updated.photos += 1;
  }
}

function abortBatch(
  errors: ImportError[],
  entity: CounterKey,
  externalId: string,
  err: unknown,
): never {
  const message = err instanceof Error ? err.message : String(err);
  errors.push({ entity, externalId, message });
  throw new BulkImportAbortError("Bulk import batch failed", errors);
}

async function runBulkImport(payload: z.infer<typeof WsFitnessBulkSchema>): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    inserted: emptyCounters(),
    updated: emptyCounters(),
    errors: [],
  };

  const userCache = new Map<string, string>();
  const planCache = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const plan of payload.plans ?? []) {
      try {
        await upsertPlan(tx, plan, result, planCache);
      } catch (err) {
        abortBatch(result.errors, "plans", plan.externalId, err);
      }
    }

    for (const member of payload.members ?? []) {
      try {
        await upsertMember(tx, member, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "members", member.externalId, err);
      }
    }

    for (const membership of payload.memberships ?? []) {
      try {
        await upsertMembership(tx, membership, result, userCache, planCache);
      } catch (err) {
        abortBatch(result.errors, "memberships", membership.externalId, err);
      }
    }

    for (const payment of payload.payments ?? []) {
      try {
        await upsertPayment(tx, payment, result, userCache, planCache);
      } catch (err) {
        abortBatch(result.errors, "payments", payment.externalId, err);
      }
    }

    for (const invoice of payload.invoices ?? []) {
      try {
        await upsertInvoice(tx, invoice, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "invoices", invoice.externalId, err);
      }
    }

    for (const checkIn of payload.checkIns ?? []) {
      try {
        await upsertCheckIn(tx, checkIn, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "checkIns", checkIn.externalId, err);
      }
    }

    for (const event of payload.turnstileEvents ?? []) {
      try {
        await upsertTurnstileEvent(tx, event, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "turnstileEvents", event.externalId, err);
      }
    }

    for (const faceLog of payload.turnstileFaceLogs ?? []) {
      try {
        await upsertTurnstileFaceLog(tx, faceLog, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "turnstileFaceLogs", faceLog.externalId, err);
      }
    }

    if (payload.photos && Object.keys(payload.photos).length > 0) {
      try {
        await importPhotosMap(tx, payload.photos, result, userCache);
      } catch (err) {
        abortBatch(result.errors, "photos", "<photos-map>", err);
      }
    }
  });

  return result;
}

// POST /api/admin/migration/wsfitness/members (legacy endpoint)
app.post(
  "/members",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", LegacyWsFitnessPayloadSchema),
  async (c) => {
    const payload = c.req.valid("json");

    const plansByKey = new Map<string, z.infer<typeof WsFitnessPlanSchema>>();
    const members: z.infer<typeof WsFitnessMemberSchema>[] = [];
    const membershipsPayload: z.infer<typeof WsFitnessMembershipSchema>[] = [];
    const photos: Record<string, string> = {};

    for (const row of payload) {
      const priceCents = Math.round(row.price * 100);
      const planExternalId = `${row.planName.toLowerCase()}::${priceCents}`;

      if (!plansByKey.has(planExternalId)) {
        plansByKey.set(planExternalId, {
          externalId: planExternalId,
          name: row.planName,
          description: `Imported from WS Fitness legacy plan (${row.planName})`,
          priceCents,
          interval: row.planName.toLowerCase().includes("year") ? "yearly" : "monthly",
          planType: "all_access",
          isActive: true,
          features: ["Imported from WS Fitness"],
        });
      }

      members.push({
        externalId: row.externalId,
        memberId: row.cardNo ?? null,
        name: row.name,
        email: row.email ?? null,
        role: "customer",
        status: "active",
        notes: row.personId
          ? `wsfitness_card=${row.externalId};person_id=${row.personId}`
          : `wsfitness_card=${row.externalId}`,
        joinedAt: row.startDate ?? row.expiryDate,
      });

      membershipsPayload.push({
        externalId: `legacy-${row.externalId}`,
        userExternalId: row.externalId,
        planExternalId,
        status:
          parseDateOrThrow(row.expiryDate, "expiryDate").getTime() > Date.now()
            ? "active"
            : "canceled",
        startDate: row.startDate ?? row.expiryDate,
        endDate: row.expiryDate,
        pricePaidCents: priceCents,
      });

      if (row.faceImageBase64) {
        photos[row.externalId] = row.faceImageBase64;
      }
    }

    try {
      const result = await runBulkImport({
        members,
        plans: Array.from(plansByKey.values()),
        memberships: membershipsPayload,
        photos: Object.keys(photos).length ? photos : undefined,
      });

      return c.json(
        success({
          tenantId: WSFITNESS_TENANT_ID,
          total: payload.length,
          ...result,
        }),
      );
    } catch (err) {
      if (err instanceof BulkImportAbortError) {
        return c.json(
          {
            success: false,
            error: { code: "MIGRATION_FAILED", message: err.message },
            data: {
              inserted: emptyCounters(),
              updated: emptyCounters(),
              errors: err.errors,
            },
          },
          400,
        );
      }

      return c.json(error("MIGRATION_FAILED", (err as Error).message), 500);
    }
  },
);

// POST /api/admin/migration/wsfitness/bulk
app.post(
  "/bulk",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", WsFitnessBulkSchema),
  async (c) => {
    const payload = c.req.valid("json");

    try {
      const result = await runBulkImport(payload);
      return c.json(success(result));
    } catch (err) {
      if (err instanceof BulkImportAbortError) {
        return c.json(
          {
            success: false,
            error: { code: "MIGRATION_BATCH_ABORTED", message: err.message },
            data: {
              inserted: emptyCounters(),
              updated: emptyCounters(),
              errors: err.errors,
            },
          },
          400,
        );
      }

      return c.json(
        error("MIGRATION_BATCH_FAILED", err instanceof Error ? err.message : String(err)),
        500,
      );
    }
  },
);

// POST /api/admin/migration/wsfitness/media
app.post(
  "/media",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", WsFitnessMediaSchema),
  async (c) => {
    const body = c.req.valid("json");

    try {
      if (body.kind === "avatar") {
        const [membership] = await db
          .select({ userId: tenantMemberships.user_id })
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
              eq(tenantMemberships.external_id, body.externalId),
            ),
          )
          .limit(1);

        if (!membership) {
          return c.json(
            error("MEMBER_NOT_FOUND", `Member externalId not found: ${body.externalId}`),
            404,
          );
        }

        const avatarUrl = await persistMediaFile({
          storageDir: AVATAR_STORAGE_DIR,
          baseUrl: AVATAR_PUBLIC_BASE_URL,
          prefix: "avatar",
          externalId: body.externalId,
          base64: body.dataBase64,
        });

        await db
          .update(users)
          .set({
            avatar_url: avatarUrl,
            updated_at: new Date(),
          })
          .where(eq(users.id, membership.userId));

        return c.json(success({ kind: "avatar", url: avatarUrl }));
      }

      const receiptUrl = await persistMediaFile({
        storageDir: RECEIPT_STORAGE_DIR,
        baseUrl: RECEIPT_PUBLIC_BASE_URL,
        prefix: "receipt",
        externalId: body.externalId,
        base64: body.dataBase64,
      });

      await db
        .update(paymentRequests)
        .set({
          receipt_url: receiptUrl,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(paymentRequests.tenant_id, WSFITNESS_TENANT_ID),
            eq(paymentRequests.external_id, body.externalId),
          ),
        );

      await db
        .update(payments)
        .set({
          receipt_url: receiptUrl,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(payments.tenant_id, WSFITNESS_TENANT_ID),
            eq(payments.external_id, body.externalId),
          ),
        );

      return c.json(success({ kind: "receipt", url: receiptUrl }));
    } catch (err) {
      return c.json(
        error("MEDIA_IMPORT_FAILED", err instanceof Error ? err.message : String(err)),
        400,
      );
    }
  },
);

export { app as wsFitnessMigrationRouter };
