import crypto from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  checkIns,
  users,
  tenantMemberships,
  subscriptions,
  memberships,
  paymentRequests,
  tenants,
  faceRegistrations,
  sessionPackages,
  sessionCredits,
} from "@timeo/db/schema";
import { eq, desc, and, ilike, count, or, gt, gte, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability, requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as CheckInService from "../services/check-in.service.js";
import * as AccessControlService from "../services/access-control.service.js";
import { dispatchTurnstileWebhook } from "../services/turnstile-webhook.service.js";
import { generateId } from "@timeo/db";
import { user as authUser, account as authAccount } from "@timeo/db/schema";

async function hashPassword(password: string): Promise<string> {
  const { hashPassword: _hash } = await import("better-auth/crypto");
  return _hash(password);
}

const app = new Hono();

// ─── Helpers ────────────────────────────────────────────────────────────────

const GYM_DEVICE_KEY_SECRET = process.env.GYM_DEVICE_KEY_SECRET ?? "";
const TURNSTILE_BRIDGE_SECRET = process.env.TURNSTILE_BRIDGE_SECRET ?? "";

function isValidBridgeSecret(value: string | undefined): boolean {
  if (!TURNSTILE_BRIDGE_SECRET || !value) {
    return false;
  }

  const expectedBuf = Buffer.from(TURNSTILE_BRIDGE_SECRET, "utf-8");
  const actualBuf = Buffer.from(value, "utf-8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function computeHmac(tenantSlug: string, memberId: string): string {
  return crypto
    .createHmac("sha256", GYM_DEVICE_KEY_SECRET)
    .update(tenantSlug + ":" + memberId)
    .digest("hex")
    .slice(0, 12);
}

function parseQrCode(raw: string): {
  tenantSlug: string;
  memberId: string;
  hmacSignature: string;
} | null {
  const parts = raw.split(":");
  if (parts.length !== 4 || parts[0] !== "TIMEO") {
    return null;
  }
  return {
    tenantSlug: parts[1],
    memberId: parts[2],
    hmacSignature: parts[3],
  };
}

function verifyHmac(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf-8");
  const actualBuf = Buffer.from(actual, "utf-8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

const CheckInBodySchema = z.object({
  memberId: z.string().min(1),
  deviceId: z.string().optional(),
  method: z.enum(["qr", "nfc", "manual"]),
});

const ManualOpenBodySchema = z.object({
  deviceSn: z.string().min(1),
  reason: z.string().optional(),
});

const PhotoUploadSchema = z.object({
  photoUrl: z.string().url(),
});

const CreateMemberSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  membershipPlan: z.string().optional(),
  coachId: z.string().optional(),
  packageId: z.string().optional(),
});

const UpdateMemberSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  role: z.enum(["customer", "coach", "staff", "admin"]).optional(),
  status: z.enum(["active", "suspended", "inactive"]).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  coach_id: z.string().trim().min(1).nullable().optional(),
  member_id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-fA-F0-9]+$/)
    .nullable()
    .optional(),
});

const UpdateMemberSubscriptionSchema = z.object({
  endDate: z.string().min(1),
});

function normalizeMembershipStatusForEdit(
  status: string | null | undefined,
): "active" | "suspended" | "inactive" {
  if (status === "active" || status === "suspended") {
    return status;
  }

  return "inactive";
}

function mapEditableStatusToDb(
  status: "active" | "suspended" | "inactive",
): "active" | "suspended" | "removed" {
  return status === "inactive" ? "removed" : status;
}

// ─── GET /overview — Gym dashboard stats ────────────────────────────────────

app.get(
  "/overview",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      // Active members (with active subscription)
      const [activeRow] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.status, "active"),
            gt(subscriptions.current_period_end, now),
          ),
        );

      // Today check-ins
      const [todayRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, todayStart),
          ),
        );

      // Enrolled faces
      const [faceRow] = await db
        .select({ count: count() })
        .from(faceRegistrations)
        .where(
          and(
            eq(faceRegistrations.tenant_id, tenantId),
            eq(faceRegistrations.status, "synced"),
          ),
        );

      // Recent activity (last 15 check-ins)
      const recentRows = await db
        .select({
          id: checkIns.id,
          method: checkIns.method,
          time: checkIns.timestamp,
          memberName: users.name,
        })
        .from(checkIns)
        .leftJoin(users, eq(checkIns.user_id, users.id))
        .where(eq(checkIns.tenant_id, tenantId))
        .orderBy(desc(checkIns.timestamp))
        .limit(15);

      const recentActivity = recentRows.map((r) => ({
        id: r.id,
        memberName: r.memberName ?? "Unknown",
        action: "check-in",
        method: r.method,
        time: r.time?.toISOString() ?? new Date().toISOString(),
      }));

      return c.json(
        success({
          activeMembers: Number(activeRow?.count ?? 0),
          todayCheckIns: Number(todayRow?.count ?? 0),
          enrolledFaces: Number(faceRow?.count ?? 0),
          devicesOnline: 0,
          recentActivity,
        }),
      );
    } catch (err) {
      return c.json(error("GYM_OVERVIEW_ERROR", (err as Error).message), 500);
    }
  },
);


// ─── POST /checkin — QR/card check-in (device API key auth, no user auth) ──

app.post("/checkin", zValidator("json", CheckInBodySchema), async (c) => {
  // Validate device API key
  const deviceKey = c.req.header("X-Device-Key");
  if (!deviceKey || !GYM_DEVICE_KEY_SECRET) {
    return c.json(
      error("UNAUTHORIZED", "Invalid or missing device key"),
      401,
    );
  }

  const expectedKeyBuf = Buffer.from(GYM_DEVICE_KEY_SECRET, "utf-8");
  const providedKeyBuf = Buffer.from(deviceKey, "utf-8");
  if (
    expectedKeyBuf.length !== providedKeyBuf.length ||
    !crypto.timingSafeEqual(expectedKeyBuf, providedKeyBuf)
  ) {
    return c.json(
      error("UNAUTHORIZED", "Invalid or missing device key"),
      401,
    );
  }

  const body = c.req.valid("json");

  // Parse QR code format: TIMEO:{tenantSlug}:{memberId}:{hmacSignature}
  const parsed = parseQrCode(body.memberId);
  if (!parsed) {
    return c.json(
      {
        success: true as const,
        data: {
          granted: false,
          memberName: null,
          reason: "Invalid QR code format",
        },
      },
      400,
    );
  }

  const { tenantSlug, memberId, hmacSignature } = parsed;

  // Verify HMAC signature
  const expectedHmac = computeHmac(tenantSlug, memberId);
  if (!verifyHmac(expectedHmac, hmacSignature)) {
    return c.json(
      {
        success: true as const,
        data: {
          granted: false,
          memberName: null,
          reason: "Invalid QR code signature",
        },
      },
      403,
    );
  }

  // Look up tenant by slug
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return c.json(
      {
        success: true as const,
        data: {
          granted: false,
          memberName: null,
          reason: "Tenant not found",
        },
      },
      404,
    );
  }

  // Validate member access (membership + subscription)
  const accessResult = await AccessControlService.validateMemberAccess(
    tenant.id,
    memberId,
  );

  if (!accessResult.allowed) {
    // Log the denied access attempt
    await AccessControlService.logAccessAttempt({
      tenantId: tenant.id,
      deviceSn: body.deviceId ?? "unknown",
      userId: memberId,
      personIdFromDevice: null,
      matchScore: null,
      matchResult: "denied",
      denyReason: accessResult.reason,
      sequenceNo: null,
      capTime: null,
      rawData: { method: body.method, source: "gym_checkin" },
    });

    return c.json(
      success({
        granted: false,
        memberName: accessResult.memberName,
        reason: accessResult.reason,
      }),
    );
  }

  // Create the check-in
  try {
    await CheckInService.createCheckIn({
      tenantId: tenant.id,
      userId: memberId,
      method: body.method,
    });

    // Log the successful access
    await AccessControlService.logAccessAttempt({
      tenantId: tenant.id,
      deviceSn: body.deviceId ?? "unknown",
      userId: memberId,
      personIdFromDevice: null,
      matchScore: null,
      matchResult: "allowed",
      denyReason: null,
      sequenceNo: null,
      capTime: null,
      rawData: { method: body.method, source: "gym_checkin" },
    });

    // Look up subscription details for response
    const now = new Date();
    const [activeSub] = await db
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.current_period_end,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenant_id, tenant.id),
          eq(subscriptions.customer_id, memberId),
          eq(subscriptions.status, "active"),
          gt(subscriptions.current_period_end, now),
        ),
      )
      .limit(1);

    return c.json(
      success({
        granted: true,
        memberName: accessResult.memberName,
        membershipType: activeSub ? "subscription" : "membership",
        expiresAt: activeSub?.currentPeriodEnd?.toISOString() ?? null,
      }),
    );
  } catch (err) {
    return c.json(error("CHECKIN_ERROR", (err as Error).message), 500);
  }
});

// ─── POST /manual-open — Staff manually opens door ──────────────────────────

app.post(
  "/manual-open",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", ManualOpenBodySchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const logId = await AccessControlService.logAccessAttempt({
        tenantId,
        deviceSn: body.deviceSn,
        userId: user.id,
        personIdFromDevice: null,
        matchScore: null,
        matchResult: "allowed",
        denyReason: null,
        sequenceNo: null,
        capTime: null,
        rawData: {
          method: "manual",
          reason: body.reason ?? null,
          openedBy: user.id,
          source: "gym_manual_open",
        },
      });

      return c.json(success({ logId, message: "Door opened successfully" }));
    } catch (err) {
      return c.json(error("MANUAL_OPEN_ERROR", (err as Error).message), 500);
    }
  },
);

// ─── GET /members — List members with search and pagination ─────────────────

app.get(
  "/members",
  async (c, next) => {
    const bridgeSecret = c.req.header("X-Turnstile-Bridge-Secret");
    if (isValidBridgeSecret(bridgeSecret)) {
      return next();
    }

    return authMiddleware(c, async () => {
      await tenantMiddleware(c, async () => {
        await requireRole("admin", "staff")(c, next);
      });
    });
  },
  async (c) => {
    const tenantId = c.get("tenantId") ?? c.req.query("tenantId");
    const search = c.req.query("search") ?? "";
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const baseCondition = eq(tenantMemberships.tenant_id, tenantId);

      const searchCondition = search
        ? and(
            baseCondition,
            or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
              ilike(tenantMemberships.member_id, `%${search}%`),
            ),
          )
        : baseCondition;

      // Get total count
      const [totalRow] = await db
        .select({ count: count() })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(searchCondition);

      const total = Number(totalRow?.count ?? 0);

      // Get paginated results
      const rows = await db
        .select({
          membership: {
            id: tenantMemberships.id,
            role: tenantMemberships.role,
            status: tenantMemberships.status,
            memberId: tenantMemberships.member_id,
          },
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatar_url,
          },
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(searchCondition)
        .orderBy(desc(tenantMemberships.joined_at))
        .limit(limit)
        .offset(offset);

      return c.json(
        success({
          members: rows,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        }),
      );
    } catch (err) {
      return c.json(error("MEMBERS_LIST_ERROR", (err as Error).message), 500);
    }
  },
);

// ─── GET /members/:memberId — Member detail ─────────────────────────────────

app.get(
  "/members/:memberId",
  async (c, next) => {
    const bridgeSecret = c.req.header("X-Turnstile-Bridge-Secret");
    if (isValidBridgeSecret(bridgeSecret)) {
      return next();
    }

    return authMiddleware(c, async () => {
      await tenantMiddleware(c, async () => {
        await requireRole("admin", "staff")(c, next);
      });
    });
  },
  async (c) => {
    const tenantId = c.get("tenantId") ?? c.req.query("tenantId");
    const memberId = c.req.param("memberId");

    try {
      // Get user + membership
      const [memberRow] = await db
        .select({
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            avatarUrl: users.avatar_url,
            createdAt: users.created_at,
          },
          membership: {
            id: tenantMemberships.id,
            role: tenantMemberships.role,
            status: tenantMemberships.status,
            notes: tenantMemberships.notes,
            tags: tenantMemberships.tags,
            memberId: tenantMemberships.member_id,
            joinedAt: tenantMemberships.joined_at,
            coachId: tenantMemberships.coach_id,
          },
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!memberRow) {
        return c.json(error("NOT_FOUND", "Member not found"), 404);
      }

      const [tenantRow] = await db
        .select({ slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const now = new Date();

      // Current/latest subscription
      const [latestSubscription] = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          membershipId: subscriptions.membership_id,
          planName: memberships.name,
          currentPeriodStart: subscriptions.current_period_start,
          currentPeriodEnd: subscriptions.current_period_end,
          cancelAtPeriodEnd: subscriptions.cancel_at_period_end,
        })
        .from(subscriptions)
        .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.customer_id, memberId),
          ),
        )
        .orderBy(desc(subscriptions.current_period_end))
        .limit(1);

      const subscriptionIsActive =
        latestSubscription?.status === "active" &&
        latestSubscription.currentPeriodEnd > now;

      const membershipStatus =
        memberRow.membership.status === "suspended"
          ? "suspended"
          : subscriptionIsActive
            ? "active"
            : "expired";

      // Get face registration status
      const faceRegs = await db
        .select({
          id: faceRegistrations.id,
          status: faceRegistrations.status,
          deviceSn: faceRegistrations.device_sn,
          registeredAt: faceRegistrations.registered_at,
          syncedAt: faceRegistrations.synced_at,
        })
        .from(faceRegistrations)
        .where(
          and(
            eq(faceRegistrations.tenant_id, tenantId),
            eq(faceRegistrations.user_id, memberId),
          ),
        );

      const hasFaceRegistered = faceRegs.some(
        (reg) => reg.status === "synced" || reg.status === "pending",
      );

      // Check-in history
      const checkInHistory = await db
        .select({
          id: checkIns.id,
          method: checkIns.method,
          gate: checkIns.gate,
          device: checkIns.device,
          entryType: checkIns.entry_type,
          notes: checkIns.notes,
          timestamp: checkIns.timestamp,
        })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, memberId),
          ),
        )
        .orderBy(desc(checkIns.timestamp))
        ;

      // Payment request history
      const paymentHistory = await db
        .select({
          id: paymentRequests.id,
          planName: paymentRequests.plan_name,
          amount: paymentRequests.amount,
          currency: paymentRequests.currency,
          status: paymentRequests.status,
          receiptUrl: paymentRequests.receipt_url,
          memberNote: paymentRequests.member_note,
          adminNote: paymentRequests.admin_note,
          approvedAt: paymentRequests.approved_at,
          rejectedAt: paymentRequests.rejected_at,
          createdAt: paymentRequests.created_at,
          updatedAt: paymentRequests.updated_at,
        })
        .from(paymentRequests)
        .where(
          and(
            eq(paymentRequests.tenant_id, tenantId),
            eq(paymentRequests.customer_id, memberId),
          ),
        )
        .orderBy(desc(paymentRequests.created_at));

      // Session credits
      const credits = await db
        .select({
          id: sessionCredits.id,
          packageId: sessionCredits.package_id,
          packageName: sessionPackages.name,
          totalSessions: sessionCredits.total_sessions,
          usedSessions: sessionCredits.used_sessions,
          expiresAt: sessionCredits.expires_at,
          purchasedAt: sessionCredits.purchased_at,
        })
        .from(sessionCredits)
        .leftJoin(sessionPackages, eq(sessionCredits.package_id, sessionPackages.id))
        .where(
          and(
            eq(sessionCredits.tenant_id, tenantId),
            eq(sessionCredits.user_id, memberId),
          ),
        )
        .orderBy(desc(sessionCredits.purchased_at));

      // Class enrollments (legacy WS Fitness tables)
      let classEnrollments: Array<{
        id: string;
        classId: string;
        className: string | null;
        status: string;
        waitlistPosition: number | null;
        startTime: Date | null;
        location: string | null;
        enrolledAt: Date;
        attendedAt: Date | null;
      }> = [];

      try {
        const enrollmentRows = await db.execute(sql`
          SELECT
            ce.id,
            ce.class_id AS "classId",
            ce.status,
            ce.waitlist_position AS "waitlistPosition",
            ce.created_at AS "enrolledAt",
            ce.attended_at AS "attendedAt",
            gc.name AS "className",
            gc.start_time AS "startTime",
            gc.location
          FROM class_enrollments ce
          LEFT JOIN group_classes gc ON gc.id = ce.class_id
          WHERE ce.tenant_id = ${tenantId}
            AND ce.user_id = ${memberId}
          ORDER BY COALESCE(gc.start_time, ce.created_at) DESC, ce.created_at DESC
        `);

        const enrollmentRecords = enrollmentRows as unknown as Array<
          Record<string, unknown>
        >;

        classEnrollments = enrollmentRecords.map((row) => {
          const waitlistValue = row.waitlistPosition;
          return {
            id: String(row.id ?? ""),
            classId: String(row.classId ?? ""),
            className: row.className ? String(row.className) : null,
            status: String(row.status ?? "enrolled"),
            waitlistPosition:
              waitlistValue === null || waitlistValue === undefined
                ? null
                : Number.isFinite(Number(waitlistValue))
                  ? Number(waitlistValue)
                  : null,
            startTime:
              row.startTime instanceof Date
                ? row.startTime
                : row.startTime
                  ? new Date(String(row.startTime))
                  : null,
            location: row.location ? String(row.location) : null,
            enrolledAt:
              row.enrolledAt instanceof Date
                ? row.enrolledAt
                : new Date(String(row.enrolledAt ?? new Date().toISOString())),
            attendedAt:
              row.attendedAt instanceof Date
                ? row.attendedAt
                : row.attendedAt
                  ? new Date(String(row.attendedAt))
                  : null,
          };
        });
      } catch (queryErr) {
        const code = (queryErr as { code?: string })?.code;
        if (code !== "42P01") {
          throw queryErr;
        }
      }

      const tags = Array.isArray(memberRow.membership.tags)
        ? memberRow.membership.tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter(Boolean)
        : [];

      const qrCode =
        tenantRow?.slug && memberRow.membership.memberId
          ? `TIMEO:${tenantRow.slug}:${memberRow.membership.memberId}:${computeHmac(tenantRow.slug, memberRow.membership.memberId)}`
          : null;

      return c.json(
        success({
          user: {
            ...memberRow.user,
            memberId: memberRow.membership.memberId,
          },
          membership: {
            ...memberRow.membership,
            tags,
          },
          membershipStatus,
          subscription: latestSubscription
            ? {
                id: latestSubscription.id,
                status: latestSubscription.status,
                membershipId: latestSubscription.membershipId,
                planName: latestSubscription.planName,
                currentPeriodStart: latestSubscription.currentPeriodStart,
                currentPeriodEnd: latestSubscription.currentPeriodEnd,
                startDate: latestSubscription.currentPeriodStart,
                endDate: latestSubscription.currentPeriodEnd,
                cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
                daysRemaining: Math.ceil(
                  (latestSubscription.currentPeriodEnd.getTime() - now.getTime()) /
                    86400000,
                ),
                isActive: subscriptionIsActive,
              }
            : null,
          payments: paymentHistory,
          checkIns: checkInHistory,
          recentCheckIns: checkInHistory.slice(0, 10),
          classEnrollments,
          sessionCredits: credits.map((credit) => ({
            ...credit,
            remainingSessions: Math.max(
              0,
              (credit.totalSessions ?? 0) - (credit.usedSessions ?? 0),
            ),
          })),
          faceRegistration: {
            registered: hasFaceRegistered,
            registrations: faceRegs,
          },
          qrCode,
        }),
      );
    } catch (err) {
      return c.json(error("MEMBER_DETAIL_ERROR", (err as Error).message), 500);
    }
  },
);

// ─── PATCH /members/:memberId — Admin edit member profile & membership ─────

app.patch(
  "/members/:memberId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("edit_customer"),
  zValidator("json", UpdateMemberSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");
    const body = c.req.valid("json");

    try {
      const [existingMember] = await db
        .select({
          userId: users.id,
          authId: users.auth_id,
          membershipId: tenantMemberships.id,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!existingMember) {
        return c.json(error("NOT_FOUND", "Member not found"), 404);
      }

      const userUpdates: Partial<typeof users.$inferInsert> = {};
      const membershipUpdates: Partial<typeof tenantMemberships.$inferInsert> = {};
      const authUpdates: Partial<typeof authUser.$inferInsert> = {};

      if (body.name !== undefined) {
        const normalizedName = body.name.trim();
        userUpdates.name = normalizedName;
        authUpdates.name = normalizedName;
      }

      if (body.email !== undefined) {
        const normalizedEmail = body.email.trim().toLowerCase();
        userUpdates.email = normalizedEmail;
        authUpdates.email = normalizedEmail;
      }

      if (body.phone !== undefined) {
        userUpdates.phone = body.phone?.trim() || null;
      }

      if (body.avatar_url !== undefined) {
        userUpdates.avatar_url = body.avatar_url?.trim() || null;
      }

      if (body.role !== undefined) {
        membershipUpdates.role = body.role;
      }

      if (body.status !== undefined) {
        membershipUpdates.status = mapEditableStatusToDb(body.status);
      }

      if (body.notes !== undefined) {
        membershipUpdates.notes = body.notes?.trim() || null;
      }

      if (body.tags !== undefined) {
        membershipUpdates.tags = Array.from(
          new Set(
            body.tags
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        );
      }

      if (body.coach_id !== undefined) {
        membershipUpdates.coach_id = body.coach_id?.trim() || null;
      }

      if (body.member_id !== undefined) {
        membershipUpdates.member_id = body.member_id?.trim().toUpperCase() || null;
      }

      if (membershipUpdates.coach_id) {
        const [coachMembership] = await db
          .select({ id: tenantMemberships.id })
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenant_id, tenantId),
              eq(tenantMemberships.user_id, membershipUpdates.coach_id),
              eq(tenantMemberships.status, "active"),
              or(
                eq(tenantMemberships.role, "coach"),
                eq(tenantMemberships.role, "staff"),
                eq(tenantMemberships.role, "admin"),
              ),
            ),
          )
          .limit(1);

        if (!coachMembership) {
          return c.json(
            error("INVALID_COACH", "Selected coach is not active in this tenant"),
            422,
          );
        }
      }

      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updated_at = new Date();
      }

      if (Object.keys(authUpdates).length > 0) {
        authUpdates.updatedAt = new Date();
      }

      await db.transaction(async (tx) => {
        if (Object.keys(userUpdates).length > 0) {
          await tx.update(users).set(userUpdates).where(eq(users.id, existingMember.userId));
        }

        if (Object.keys(membershipUpdates).length > 0) {
          await tx
            .update(tenantMemberships)
            .set(membershipUpdates)
            .where(eq(tenantMemberships.id, existingMember.membershipId));
        }

        if (existingMember.authId && Object.keys(authUpdates).length > 0) {
          await tx
            .update(authUser)
            .set(authUpdates)
            .where(eq(authUser.id, existingMember.authId));
        }
      });

      const [updatedMember] = await db
        .select({
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            avatarUrl: users.avatar_url,
          },
          membership: {
            id: tenantMemberships.id,
            role: tenantMemberships.role,
            status: tenantMemberships.status,
            notes: tenantMemberships.notes,
            tags: tenantMemberships.tags,
            memberId: tenantMemberships.member_id,
            coachId: tenantMemberships.coach_id,
          },
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!updatedMember) {
        return c.json(error("NOT_FOUND", "Member not found"), 404);
      }

      const tags = Array.isArray(updatedMember.membership.tags)
        ? updatedMember.membership.tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter(Boolean)
        : [];

      return c.json(
        success({
          user: {
            ...updatedMember.user,
            memberId: updatedMember.membership.memberId,
          },
          membership: {
            ...updatedMember.membership,
            status: normalizeMembershipStatusForEdit(updatedMember.membership.status),
            tags,
          },
        }),
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        return c.json(error("CONFLICT", "Email already exists"), 409);
      }

      return c.json(error("MEMBER_UPDATE_ERROR", (err as Error).message), 500);
    }
  },
);

// ─── PATCH /members/:memberId/subscription — Admin edit subscription dates ─

app.patch(
  "/members/:memberId/subscription",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", UpdateMemberSubscriptionSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");
    const body = c.req.valid("json");

    const nextEndDate = new Date(body.endDate);
    if (Number.isNaN(nextEndDate.getTime())) {
      return c.json(error("BAD_REQUEST", "Invalid endDate"), 400);
    }

    try {
      const [memberRow] = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!memberRow) {
        return c.json(error("NOT_FOUND", "Member not found"), 404);
      }

      const [latestSubscription] = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          membershipId: subscriptions.membership_id,
          planName: memberships.name,
          currentPeriodStart: subscriptions.current_period_start,
          currentPeriodEnd: subscriptions.current_period_end,
          cancelAtPeriodEnd: subscriptions.cancel_at_period_end,
        })
        .from(subscriptions)
        .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.customer_id, memberId),
          ),
        )
        .orderBy(desc(subscriptions.current_period_end))
        .limit(1);

      if (!latestSubscription) {
        return c.json(error("NOT_FOUND", "Subscription not found"), 404);
      }

      await db
        .update(subscriptions)
        .set({
          current_period_end: nextEndDate,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, latestSubscription.id));

      const now = new Date();
      const isActive = latestSubscription.status === "active" && nextEndDate > now;

      return c.json(
        success({
          id: latestSubscription.id,
          status: latestSubscription.status,
          membershipId: latestSubscription.membershipId,
          planName: latestSubscription.planName,
          currentPeriodStart: latestSubscription.currentPeriodStart,
          currentPeriodEnd: nextEndDate,
          startDate: latestSubscription.currentPeriodStart,
          endDate: nextEndDate,
          cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
          daysRemaining: Math.ceil((nextEndDate.getTime() - now.getTime()) / 86400000),
          isActive,
        }),
      );
    } catch (err) {
      return c.json(
        error("MEMBER_SUBSCRIPTION_UPDATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ─── POST /members/:id/photo — Upload member photo ─────────────────────────

app.post(
  "/members/:id/photo",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", PhotoUploadSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("id");
    const body = c.req.valid("json");

    try {
      // Verify the member belongs to this tenant
      const [membership] = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!membership) {
        return c.json(error("NOT_FOUND", "Member not found in this tenant"), 404);
      }

      // Update user avatar
      await db
        .update(users)
        .set({
          avatar_url: body.photoUrl,
          updated_at: new Date(),
        })
        .where(eq(users.id, memberId));

      dispatchTurnstileWebhook({
        event: "face.enrolled",
        tenantId,
        userId: memberId,
        memberId,
        faceImageUrl: body.photoUrl,
      });

      return c.json(
        success({
          userId: memberId,
          avatarUrl: body.photoUrl,
        }),
      );
    } catch (err) {
      return c.json(error("PHOTO_UPLOAD_ERROR", (err as Error).message), 500);
    }
  },
);

// ─── POST /members — Create a new gym member ──────────────────────────────

app.post(
  "/members",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreateMemberSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      // Check if user already exists
      const [existingUser] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .limit(1);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user with temporary password
        const tempPassword = generateId().slice(0, 12);
        const passwordHash = await hashPassword(tempPassword);
        const authId = generateId();

        await db.insert(authUser).values({
          id: authId,
          name: body.name,
          email: body.email.toLowerCase(),
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db.insert(authAccount).values({
          id: generateId(),
          accountId: authId,
          providerId: "credential",
          userId: authId,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Map auth user to timeo user
        userId = generateId();
        await db.insert(users).values({
          id: userId,
          auth_id: authId,
          name: body.name,
          email: body.email.toLowerCase(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Check if already a member of this tenant
      const [existingMembership] = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, userId),
          ),
        )
        .limit(1);

      let membershipId: string;
      if (existingMembership) {
        membershipId = existingMembership.id;
        // Ensure status is active
        await db
          .update(tenantMemberships)
          .set({ status: "active" })
          .where(eq(tenantMemberships.id, membershipId));
      } else {
        membershipId = generateId();
        await db.insert(tenantMemberships).values({
          id: membershipId,
          tenant_id: tenantId,
          user_id: userId,
          role: "customer",
          status: "active",
          joined_at: new Date(),
        });
      }

      // Assign coach if provided
      if (body.coachId) {
        await db
          .update(tenantMemberships)
          .set({ coach_id: body.coachId })
          .where(eq(tenantMemberships.id, membershipId));
      }

      // Assign session package if provided
      if (body.packageId) {
        const [pkg] = await db
          .select({ sessionCount: sessionPackages.session_count })
          .from(sessionPackages)
          .where(eq(sessionPackages.id, body.packageId))
          .limit(1);
        if (pkg) {
          await db.insert(sessionCredits).values({
            id: generateId(),
            tenant_id: tenantId,
            user_id: userId,
            package_id: body.packageId,
            total_sessions: pkg.sessionCount,
            used_sessions: 0,
          });
        }
      }

      return c.json(
        success({
          id: userId,
          name: body.name,
          email: body.email.toLowerCase(),
          membershipId,
        }),
        existingMembership ? 200 : 201,
      );
    } catch (err) {
      return c.json(error("CREATE_MEMBER_ERROR", (err as Error).message), 500);
    }
  },
);

export { app as gymRouter };
