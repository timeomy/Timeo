// GATE ACCESS VERIFICATION API
//
// QR code format — PERMANENT (member card):
//   TM:{member_id}:{hmac_truncated}
//   HMAC = sha256(member_id:tenant_id, QR_TOKEN_SECRET), base64url, first 16 chars
//   e.g. "TM:WS-7K3M9X:aBcDeFgHiJkLmNoP"
//   No expiry — same code forever. Revoke by changing member_id (rare).
//
// Legacy rotating token format (still accepted for backward compat):
//   {base64url(userId:tenantId)}.{sig}
//
// Scanner endpoint (no auth):
//   POST /api/gate/verify
//   Body: { "qrData": "...", "tenantId": "...", "deviceId": "..." }
//
// Member app (authenticated):
//   GET /api/gate/qr-token?tenantId=xxx  (legacy, still works)
//   GET /api/tenants/:id/check-ins/qr-code  (new permanent, preferred)

import { Hono } from "hono";
import { createHmac } from "crypto";
import { db } from "@timeo/db";
import { generateId } from "@timeo/db";
import {
  checkIns,
  users,
  auditLogs,
  tenantMemberships,
  tenants,
  subscriptions,
  memberships,
} from "@timeo/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";
import * as AccessControl from "../services/access-control.service.js";

const app = new Hono();
const QR_SECRET = process.env.QR_TOKEN_SECRET ?? "timeo-qr-secret-change-me";

const ValidateCardSchema = z.object({
  cardNo: z.string().min(1),
  tenantId: z.string().min(1),
});

function normalizeCardNo(cardNo: string): string {
  return cardNo.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getCardCandidates(cardNo: string): string[] {
  const normalized = normalizeCardNo(cardNo);
  if (!normalized) return [];
  const lastEight = normalized.length > 8 ? normalized.slice(-8) : normalized;
  return Array.from(new Set([normalized, lastEight].filter(Boolean)));
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

// ─── Permanent QR helpers ────────────────────────────────────────────────────

export function signPermanentCode(memberId: string, tenantId: string): string {
  return createHmac("sha256", QR_SECRET)
    .update(`${memberId}:${tenantId}`)
    .digest("base64url")
    .substring(0, 16);
}

export function buildPermanentQr(memberId: string, tenantId: string): string {
  const sig = signPermanentCode(memberId, tenantId);
  return `TM:${memberId}:${sig}`;
}

function verifyPermanentQr(
  qrData: string,
  tenantId: string,
): { valid: boolean; memberId?: string } {
  const parts = qrData.split(":");
  // TM : member_id(may contain -) : sig  →  parts[0]="TM", parts[1..n-1]=memberId, parts[n]=sig
  if (parts.length < 3 || parts[0] !== "TM") return { valid: false };
  const sig = parts[parts.length - 1];
  const memberId = parts.slice(1, -1).join(":");
  const expected = signPermanentCode(memberId, tenantId);
  if (sig !== expected) return { valid: false };
  return { valid: true, memberId };
}

// ─── Legacy rotating token helpers (kept for backward compat) ───────────────

function getWindow(): number {
  return Math.floor(Date.now() / 30000);
}

function signToken(userId: string, tenantId: string, window: number): string {
  const payload = `${userId}:${tenantId}:${window}`;
  return createHmac("sha256", QR_SECRET)
    .update(payload)
    .digest("base64url")
    .substring(0, 20);
}

function buildToken(userId: string, tenantId: string): string {
  const window = getWindow();
  const identity = Buffer.from(`${userId}:${tenantId}`).toString("base64url");
  const sig = signToken(userId, tenantId, window);
  return `${identity}.${sig}`;
}

// ─── GET /qr-token — Legacy rotating token (keep for compat) ────────────────

app.get("/qr-token", authMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.req.query("tenantId");
  if (!tenantId) return c.json(error("BAD_REQUEST", "tenantId required"), 400);

  const token = buildToken(user.id, tenantId);
  const window = getWindow();
  const expiresAt = (window + 1) * 30000;

  return c.json(success({ token, expiresAt, windowMs: 30000 }));
});

// ─── POST /validate-card — Kiosk card validation against Timeo DB ────────────

app.post("/validate-card", zValidator("json", ValidateCardSchema), async (c) => {
  const { cardNo, tenantId } = c.req.valid("json");
  const providedToken = (c.req.header("X-Kiosk-Token") ?? "").trim();

  try {
    const [tenantRow] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenantRow) {
      return c.json({ valid: false, error: 8, tts: "Not registered" }, 404);
    }

    const tenantSettings = (tenantRow.settings ?? {}) as Record<string, unknown>;
    const expectedToken =
      typeof tenantSettings.kioskToken === "string"
        ? tenantSettings.kioskToken.trim()
        : "";

    if (!providedToken || !expectedToken || providedToken !== expectedToken) {
      return c.json({ valid: false, error: 8, tts: "Unauthorized" }, 401);
    }

    const candidates = getCardCandidates(cardNo);

    if (candidates.length === 0) {
      return c.json({ valid: false, error: 8, tts: "Not registered" });
    }

    let matchedMember:
      | {
          userId: string;
          memberId: string | null;
          memberName: string;
        }
      | null = null;

    for (const candidate of candidates) {
      const [row] = await db
        .select({
          userId: tenantMemberships.user_id,
          memberId: tenantMemberships.member_id,
          memberName: users.name,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            ilike(tenantMemberships.member_id, candidate),
          ),
        )
        .limit(1);

      if (row) {
        matchedMember = row;
        break;
      }
    }

    if (!matchedMember) {
      return c.json({ valid: false, error: 8, tts: "Not registered" });
    }

    const [activeSubscription] = await db
      .select({
        id: subscriptions.id,
        planName: memberships.name,
        currentPeriodEnd: subscriptions.current_period_end,
      })
      .from(subscriptions)
      .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
      .where(
        and(
          eq(subscriptions.tenant_id, tenantId),
          eq(subscriptions.customer_id, matchedMember.userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.current_period_end))
      .limit(1);

    if (!activeSubscription || activeSubscription.currentPeriodEnd < new Date()) {
      return c.json({
        valid: false,
        error: 8,
        tts: "Membership expired",
        expiryDate: activeSubscription?.currentPeriodEnd?.toISOString() ?? null,
        memberName: matchedMember.memberName,
      });
    }

    return c.json({
      valid: true,
      error: 0,
      tts: activeSubscription.planName ?? "Membership active",
      planName: activeSubscription.planName ?? null,
      memberName: matchedMember.memberName,
      expiryDate: activeSubscription.currentPeriodEnd.toISOString(),
      daysRemaining: daysUntil(activeSubscription.currentPeriodEnd),
    });
  } catch (err) {
    console.error("Gate validate-card error:", err);
    return c.json({ valid: false, error: 8, tts: "Validation failed" }, 500);
  }
});

// ─── POST /verify — Scanner verifies QR (permanent or legacy) ───────────────

app.post("/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const qrData = body.qrData as string | undefined;
  const deviceId = body.deviceId as string | undefined;
  // tenantId can come from body OR be derived from the QR (for multi-tenant scanners)
  const tenantIdHint = body.tenantId as string | undefined;

  if (!qrData) {
    return c.json({ allowed: false, message: "Invalid QR" }, 400);
  }

  let userId: string;
  let tenantId: string;

  // ── Try permanent QR format first ──────────────────────────────────────────
  if (qrData.startsWith("TM:")) {
    if (!tenantIdHint) {
      return c.json({ allowed: false, message: "tenantId required for permanent QR" }, 400);
    }
    tenantId = tenantIdHint;
    const result = verifyPermanentQr(qrData, tenantId);
    if (!result.valid || !result.memberId) {
      return c.json({ allowed: false, message: "Invalid or forged QR code" });
    }
    // Look up user by member_id + tenantId
    const [membership] = await db
      .select({ userId: tenantMemberships.user_id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.member_id, result.memberId),
        ),
      )
      .limit(1);

    if (!membership) {
      return c.json({ allowed: false, message: "Member not found" });
    }
    userId = membership.userId;

  } else {
    // ── Legacy rotating token ────────────────────────────────────────────────
    const dotIndex = qrData.lastIndexOf(".");
    if (dotIndex === -1) {
      return c.json({ allowed: false, message: "Malformed QR" }, 400);
    }
    const identity = qrData.substring(0, dotIndex);
    const sig = qrData.substring(dotIndex + 1);
    try {
      const decoded = Buffer.from(identity, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length !== 2) throw new Error("bad format");
      [userId, tenantId] = parts;
    } catch {
      return c.json({ allowed: false, message: "Invalid QR data" }, 400);
    }
    const currentWindow = getWindow();
    const validSigs = [
      signToken(userId, tenantId, currentWindow),
      signToken(userId, tenantId, currentWindow - 1),
    ];
    if (!validSigs.includes(sig)) {
      return c.json({ allowed: false, message: "QR expired or invalid" });
    }
  }

  // ── Common: validate membership & record check-in ─────────────────────────
  try {
    const validation = await AccessControl.validateMemberAccess(tenantId, userId);
    if (!validation.allowed) {
      return c.json({
        allowed: false,
        message:
          validation.reason === "not_found"
            ? "Member not found"
            : validation.reason === "subscription_expired"
              ? "Subscription expired"
              : "Membership inactive or suspended",
        memberName: validation.memberName,
      });
    }

    const checkInId = generateId();
    await db.insert(checkIns).values({
      id: checkInId,
      tenant_id: tenantId,
      user_id: userId,
      method: "qr",
    });
    await db
      .insert(auditLogs)
      .values({
        id: generateId(),
        tenant_id: tenantId,
        actor_id: userId,
        actor_role: "customer",
        action: "check_in.qr_access",
        resource_type: "check_in",
        resource_id: checkInId,
        details: { method: "qr", deviceId: deviceId ?? null },
      })
      .catch(() => {});

    return c.json({ allowed: true, message: "Access granted", memberName: validation.memberName });
  } catch (err) {
    console.error("Gate verify error:", err);
    return c.json({ allowed: false, message: "Verification failed" }, 500);
  }
});

export { app as gateRouter };


// ─── POST /verify-nfc — NFC reader ──────────────────────────────────────────
// TODO: Implement NFC card field in users table and uncomment this route
/*
app.post("/verify-nfc", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const nfcUid = body.nfcUid as string | undefined;
  const tenantId = body.tenantId as string | undefined;
  const deviceId = body.deviceId as string | undefined;

  if (!nfcUid || !tenantId) {
    return c.json({ allowed: false, message: "Missing nfcUid or tenantId" }, 400);
  }

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.nfc_card_id, nfcUid))
    .limit(1);

  if (!userRecord) {
    return c.json({ allowed: false, message: "NFC card not registered" });
  }

  try {
    const validation = await AccessControl.validateMemberAccess(tenantId, userRecord.id);
    if (!validation.allowed) {
      return c.json({
        allowed: false,
        message:
          validation.reason === "not_found"
            ? "Member not found"
            : validation.reason === "subscription_expired"
              ? "Subscription expired"
              : "Membership inactive or suspended",
        memberName: validation.memberName,
      });
    }

    const checkInId = generateId();
    await db.insert(checkIns).values({
      id: checkInId,
      tenant_id: tenantId,
      user_id: userRecord.id,
      method: "nfc",
    });
    await db
      .insert(auditLogs)
      .values({
        id: generateId(),
        tenant_id: tenantId,
        actor_id: userRecord.id,
        actor_role: "customer",
        action: "check_in.nfc_access",
        resource_type: "check_in",
        resource_id: checkInId,
        details: { method: "nfc", deviceId: deviceId ?? null, nfcUid },
      })
      .catch(() => {});

    return c.json({ allowed: true, message: "Access granted", memberName: validation.memberName });
  } catch (err) {
    console.error("NFC verify error:", err);
    return c.json({ allowed: false, message: "Verification failed" }, 500);
  }
});

// ─── POST /register-nfc ──────────────────────────────────────────────────────

app.post("/register-nfc", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const nfcUid = body.nfcUid as string | undefined;
  if (!userId || !nfcUid) {
    return c.json(error("BAD_REQUEST", "userId and nfcUid required"), 400);
  }
  try {
    await db.update(users).set({ nfc_card_id: nfcUid }).where(eq(users.id, userId));
    return c.json(success({ registered: true }));
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json(error("CONFLICT", "This NFC card is already registered to another member"), 409);
    }
    throw err;
  }
});

// ─── DELETE /register-nfc ────────────────────────────────────────────────────

app.delete("/register-nfc", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  if (!userId) return c.json(error("BAD_REQUEST", "userId required"), 400);
  await db.update(users).set({ nfc_card_id: null }).where(eq(users.id, userId));
  return c.json(success({ removed: true }));
});
*/

export { app as gateRoutes };
