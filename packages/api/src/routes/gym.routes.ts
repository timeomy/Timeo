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
  tenants,
  faceRegistrations,
} from "@timeo/db/schema";
import { eq, desc, and, like, count, or, gt } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as CheckInService from "../services/check-in.service.js";
import * as AccessControlService from "../services/access-control.service.js";

const app = new Hono();

// ─── Helpers ────────────────────────────────────────────────────────────────

const GYM_DEVICE_KEY_SECRET = process.env.GYM_DEVICE_KEY_SECRET ?? "";

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
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
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
              like(users.name, `%${search}%`),
              like(users.email, `%${search}%`),
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
            notes: tenantMemberships.notes,
            tags: tenantMemberships.tags,
            joinedAt: tenantMemberships.joined_at,
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

// ─── GET /members/:id — Member detail ───────────────────────────────────────

app.get(
  "/members/:id",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("id");

    try {
      // Get user + membership
      const [memberRow] = await db
        .select({
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatar_url,
            createdAt: users.created_at,
          },
          membership: {
            id: tenantMemberships.id,
            role: tenantMemberships.role,
            status: tenantMemberships.status,
            notes: tenantMemberships.notes,
            tags: tenantMemberships.tags,
            joinedAt: tenantMemberships.joined_at,
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

      // Get subscription status
      const now = new Date();
      const [activeSub] = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          currentPeriodStart: subscriptions.current_period_start,
          currentPeriodEnd: subscriptions.current_period_end,
          cancelAtPeriodEnd: subscriptions.cancel_at_period_end,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.customer_id, memberId),
            eq(subscriptions.status, "active"),
            gt(subscriptions.current_period_end, now),
          ),
        )
        .limit(1);

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

      // Get recent check-ins (last 10)
      const recentCheckIns = await db
        .select({
          id: checkIns.id,
          method: checkIns.method,
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
        .limit(10);

      return c.json(
        success({
          user: memberRow.user,
          membership: memberRow.membership,
          subscription: activeSub ?? null,
          faceRegistration: {
            registered: hasFaceRegistered,
            registrations: faceRegs,
          },
          recentCheckIns,
        }),
      );
    } catch (err) {
      return c.json(error("MEMBER_DETAIL_ERROR", (err as Error).message), 500);
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

export { app as gymRouter };
