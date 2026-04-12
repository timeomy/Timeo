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

import { Hono, type Context } from "hono";
import { createDecipheriv, createHmac } from "crypto";
import { db } from "@timeo/db";
import { generateId } from "@timeo/db";
import {
  checkIns,
  users,
  auditLogs,
  accessLogs,
  tenantMemberships,
  tenants,
  subscriptions,
  memberships,
  faceRegistrations,
} from "@timeo/db/schema";
import { eq, and, ilike, desc, or, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";
import * as AccessControl from "../services/access-control.service.js";

const app = new Hono();
const QR_SECRET = process.env.QR_TOKEN_SECRET ?? "timeo-qr-secret-change-me";
const WS_FITNESS_QR_KEY = "wsfitness_secret";
const QR_TIMESTAMP_TOLERANCE_SECONDS = 300;
const QR_GRACE_DAYS = 365;
const ZAH_RESPONSE_CONTENT_TYPE = "text/html; charset=utf-8";
const HEX_8_REGEX = /^[0-9A-F]{8}$/i;
const ENCRYPTED_QR_REGEX = /^[0-9A-F]{32}$/i;

type KioskTokenVerificationResult =
  | {
      ok: true;
      settings: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      reason: string;
    };

type GateAccessType = "door" | "turnstile";

type ZAHResponsePayload = {
  result: number;
  cmd: number;
  description: string;
  eventNo: number;
  openCount?: number;
  voiceIndex?: number;
  isIn?: number;
  time?: string;
};

const ValidateCardSchema = z.object({
  cardNo: z.string().min(1),
  tenantId: z.string().min(1),
});

const ValidateQrSchema = z.object({
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

function getExternalIdCandidates(cardNo: string): string[] {
  const raw = cardNo.trim();
  const normalized = normalizeCardNo(cardNo);

  return Array.from(
    new Set([raw, raw.toUpperCase(), raw.toLowerCase(), normalized].filter(Boolean)),
  );
}

function getLegacyCardCandidates(cardNo: string): {
  numericPart: string | null;
  candidates: string[];
} {
  const raw = cardNo.trim();

  if (!raw) {
    return {
      numericPart: null,
      candidates: [],
    };
  }

  const withoutSuffix = raw.replace(/_0$/i, "");
  const numericMatch = withoutSuffix.match(/\d+/);

  if (!numericMatch) {
    return {
      numericPart: null,
      candidates: [],
    };
  }

  const numeric = numericMatch[0];
  const normalizedNumeric = numeric.replace(/^0+/, "") || "0";

  return {
    numericPart: normalizedNumeric,
    candidates: Array.from(
      new Set([
        numeric,
        normalizedNumeric,
        `${numeric}_0`,
        `${normalizedNumeric}_0`,
      ]),
    ),
  };
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed = parseInteger(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseZahCommand(value: unknown): number | null {
  const parsed = parseInteger(value);
  if (parsed === 0 || parsed === 1) {
    return parsed;
  }

  return null;
}

function getEventNo(value: unknown): number {
  const parsed = parseInteger(value);
  return parsed ?? 0;
}

function formatZahTimestamp(date: Date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendZahResponse(c: Context, payload: ZAHResponsePayload) {
  c.header("Content-Type", ZAH_RESPONSE_CONTENT_TYPE);
  return c.body(JSON.stringify(payload));
}

function buildZahHeartbeatResponse(eventNo: number): ZAHResponsePayload {
  return {
    result: 0,
    cmd: 0,
    description: "ok",
    eventNo,
    time: formatZahTimestamp(),
  };
}

function buildZahAllowedResponse(input: {
  eventNo: number;
  memberName: string;
  graceMode: boolean;
}): ZAHResponsePayload {
  const safeMemberName = escapeHtml(input.memberName || "Member");
  const statusLine = input.graceMode
    ? "<font color='orange'>Please Renew</font>"
    : "<font color='green'>Authorized</font>";

  return {
    result: 0,
    cmd: 1,
    eventNo: input.eventNo,
    openCount: 1,
    voiceIndex: 2,
    isIn: 1,
    description: `<h1>Welcome</h1><p>${safeMemberName}</p>${statusLine}`,
  };
}

function buildZahDeniedResponse(eventNo: number, reason: string): ZAHResponsePayload {
  return {
    result: 0,
    cmd: 1,
    eventNo,
    openCount: 0,
    voiceIndex: 5,
    isIn: 1,
    description: `<h1>STOP</h1><font color='red'>${escapeHtml(reason)}</font>`,
  };
}

function getGateAccessType(c: Context): GateAccessType {
  return c.req.query("type") === "turnstile" ? "turnstile" : "door";
}

function resolveZahCredentials(c: Context): {
  tenantId: string;
  kioskToken: string;
} {
  const params = c.req.param();

  const tenantId =
    (params.tenantId ?? c.req.query("tenant") ?? c.req.query("tenantId") ?? "").trim();

  const kioskToken = (params.kioskToken ?? c.req.query("token") ?? "").trim();

  return {
    tenantId,
    kioskToken,
  };
}

function getDoorGraceDays(settings: Record<string, unknown>): number {
  const settingSources: unknown[] = [
    settings.zahDoorGraceDays,
    settings.gateGraceDays,
    settings.doorGraceDays,
    settings.qrGraceDays,
    asRecord(settings.gate)?.zahDoorGraceDays,
    asRecord(settings.gate)?.doorGraceDays,
    asRecord(settings.gate)?.graceDays,
    asRecord(settings.accessControl)?.zahDoorGraceDays,
    asRecord(settings.accessControl)?.doorGraceDays,
    asRecord(settings.accessControl)?.graceDays,
  ];

  for (const candidate of settingSources) {
    const parsed = parsePositiveInteger(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return QR_GRACE_DAYS;
}

function getDeviceSnFromPayload(
  payload: Record<string, unknown>,
  accessType: GateAccessType,
): string {
  const rawValue =
    typeof payload.device_sn === "string"
      ? payload.device_sn
      : typeof payload.deviceSn === "string"
        ? payload.deviceSn
        : "";

  const deviceSn = rawValue.trim();

  if (deviceSn) {
    return deviceSn;
  }

  return accessType === "turnstile" ? "zah-cloud-turnstile" : "zah-cloud-door";
}

async function logZahAccessAttempt(input: {
  tenantId: string;
  userId: string | null;
  memberId: string | null;
  eventNo: number;
  allowed: boolean;
  reason: string | null;
  accessType: GateAccessType;
  payload: Record<string, unknown>;
}) {
  const capTime =
    typeof input.payload.cap_time === "string"
      ? input.payload.cap_time
      : typeof input.payload.time === "string"
        ? input.payload.time
        : null;

  try {
    await db.insert(accessLogs).values({
      id: generateId(),
      tenant_id: input.tenantId,
      device_sn: getDeviceSnFromPayload(input.payload, input.accessType),
      user_id: input.userId,
      person_id_from_device: input.memberId,
      match_result: input.allowed ? "allowed" : "denied",
      deny_reason: input.allowed ? null : input.reason,
      method: "qr",
      sequence_no: input.eventNo,
      cap_time: capTime,
      device_raw_data: {
        ...input.payload,
        accessType: input.accessType,
      },
    });
  } catch (err) {
    console.error("Gate ZAH access-log error:", err);
  }
}

async function verifyKioskToken(
  tenantId: string,
  providedToken: string,
): Promise<KioskTokenVerificationResult> {
  const [tenantRow] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRow) {
    return { ok: false as const, status: 404, reason: "Not registered" };
  }

  const tenantSettings = asRecord(tenantRow.settings) ?? {};
  const expectedToken =
    typeof tenantSettings.kioskToken === "string"
      ? tenantSettings.kioskToken.trim()
      : "";

  if (!providedToken || !expectedToken || providedToken !== expectedToken) {
    return { ok: false as const, status: 401, reason: "Unauthorized" };
  }

  return {
    ok: true,
    settings: tenantSettings,
  };
}

function decryptQrHexPayload(encryptedHex: string): string | null {
  try {
    const decipher = createDecipheriv(
      "aes-128-ecb",
      Buffer.from(WS_FITNESS_QR_KEY, "utf8"),
      null,
    );
    decipher.setAutoPadding(false);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function resolveMemberIdFromCardNo(cardNo: string): {
  memberId: string | null;
  reason?: string;
  qrTimestamp?: number;
} {
  const rawCardNo = cardNo.trim();

  if (!rawCardNo) {
    return { memberId: null, reason: "Invalid card value" };
  }

  if (ENCRYPTED_QR_REGEX.test(rawCardNo)) {
    const decrypted = decryptQrHexPayload(rawCardNo);

    if (!decrypted || decrypted.length < 16) {
      return { memberId: null, reason: "Invalid QR code" };
    }

    const payload = decrypted.slice(0, 16).toUpperCase();
    const memberIdHex = payload.slice(0, 8);
    const timestampHex = payload.slice(8, 16);

    if (!HEX_8_REGEX.test(memberIdHex) || !HEX_8_REGEX.test(timestampHex)) {
      return { memberId: null, reason: "Invalid QR payload" };
    }

    const qrTimestamp = parseInt(timestampHex, 16);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (!Number.isFinite(qrTimestamp)) {
      return { memberId: null, reason: "Invalid QR timestamp" };
    }

    if (Math.abs(currentTimestamp - qrTimestamp) > QR_TIMESTAMP_TOLERANCE_SECONDS) {
      return { memberId: null, reason: "QR expired" };
    }

    return {
      memberId: memberIdHex,
      qrTimestamp,
    };
  }

  if (HEX_8_REGEX.test(rawCardNo)) {
    return { memberId: rawCardNo.toUpperCase() };
  }

  return { memberId: rawCardNo };
}

async function handleZahValidation(c: Context) {
  const payload = asRecord(await c.req.json().catch(() => null)) ?? {};
  const eventNo = getEventNo(payload.eventNo);
  const cmd = parseZahCommand(payload.cmd);
  const accessType = getGateAccessType(c);
  const { tenantId, kioskToken } = resolveZahCredentials(c);

  if (!tenantId || !kioskToken) {
    return sendZahResponse(c, buildZahDeniedResponse(eventNo, "Unauthorized"));
  }

  try {
    const tokenCheck = await verifyKioskToken(tenantId, kioskToken);

    if (!tokenCheck.ok) {
      return sendZahResponse(c, buildZahDeniedResponse(eventNo, tokenCheck.reason));
    }

    if (cmd === 0) {
      return sendZahResponse(c, buildZahHeartbeatResponse(eventNo));
    }

    if (cmd !== 1) {
      return sendZahResponse(c, buildZahDeniedResponse(eventNo, "Unsupported command"));
    }

    const cardNo = typeof payload.cardNo === "string" ? payload.cardNo : "";
    const resolved = resolveMemberIdFromCardNo(cardNo);

    if (!resolved.memberId) {
      const reason = resolved.reason ?? "Invalid card value";

      await logZahAccessAttempt({
        tenantId,
        userId: null,
        memberId: null,
        eventNo,
        allowed: false,
        reason,
        accessType,
        payload,
      });

      return sendZahResponse(c, buildZahDeniedResponse(eventNo, reason));
    }

    const memberCandidates = Array.from(
      new Set([resolved.memberId, resolved.memberId.toUpperCase()]),
    );

    let matchedMember:
      | {
          userId: string;
          memberId: string | null;
          memberName: string;
          memberStatus: string;
        }
      | null = null;

    for (const candidate of memberCandidates) {
      const [row] = await db
        .select({
          userId: tenantMemberships.user_id,
          memberId: tenantMemberships.member_id,
          memberName: users.name,
          memberStatus: tenantMemberships.status,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.member_id, candidate),
          ),
        )
        .limit(1);

      if (row) {
        matchedMember = {
          userId: row.userId,
          memberId: row.memberId,
          memberName: row.memberName ?? "Member",
          memberStatus: row.memberStatus,
        };
        break;
      }
    }

    // Try face_registrations lookup if no member found by member_id
    if (!matchedMember) {
      {
        // Try matching device_person_id against the raw cardNo or resolved memberId
        const faceCandidates = [resolved.rawCardNo, resolved.memberId, `${resolved.memberId}_0`].filter(Boolean);
        for (const faceId of faceCandidates) {
          const [faceRow] = await db
            .select({
              userId: tenantMemberships.user_id,
              memberId: tenantMemberships.member_id,
              memberName: users.name,
              memberStatus: tenantMemberships.status,
            })
            .from(faceRegistrations)
            .innerJoin(tenantMemberships, and(
              eq(tenantMemberships.user_id, faceRegistrations.user_id),
              eq(tenantMemberships.tenant_id, tenantId),
            ))
            .innerJoin(users, eq(tenantMemberships.user_id, users.id))
            .where(
              and(
                eq(faceRegistrations.tenant_id, tenantId),
                sql`${faceRegistrations.device_person_id} IN (${faceId}, ${faceId + '_0'})`,
              ),
            )
            .limit(1);
          if (faceRow) {
            matchedMember = {
              userId: faceRow.userId,
              memberId: faceRow.memberId,
              memberName: faceRow.memberName ?? "Member",
              memberStatus: faceRow.memberStatus,
            };
            break;
          }
        }
      }
    }

    if (!matchedMember) {
      const reason = "Not registered";

      await logZahAccessAttempt({
        tenantId,
        userId: null,
        memberId: resolved.memberId,
        eventNo,
        allowed: false,
        reason,
        accessType,
        payload,
      });

      return sendZahResponse(c, buildZahDeniedResponse(eventNo, reason));
    }

    if (matchedMember.memberStatus !== "active") {
      const reason =
        matchedMember.memberStatus === "suspended"
          ? "Membership suspended"
          : "Membership inactive";

      await logZahAccessAttempt({
        tenantId,
        userId: matchedMember.userId,
        memberId: matchedMember.memberId,
        eventNo,
        allowed: false,
        reason,
        accessType,
        payload,
      });

      return sendZahResponse(c, buildZahDeniedResponse(eventNo, reason));
    }

    const [latestSubscription] = await db
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.current_period_end,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenant_id, tenantId),
          eq(subscriptions.customer_id, matchedMember.userId),
        ),
      )
      .orderBy(desc(subscriptions.current_period_end))
      .limit(1);

    if (!latestSubscription) {
      const reason = "Membership expired";

      await logZahAccessAttempt({
        tenantId,
        userId: matchedMember.userId,
        memberId: matchedMember.memberId,
        eventNo,
        allowed: false,
        reason,
        accessType,
        payload,
      });

      return sendZahResponse(c, buildZahDeniedResponse(eventNo, reason));
    }

    const now = new Date();
    const subscriptionExpiry = latestSubscription.currentPeriodEnd;
    const hasActiveSubscription =
      latestSubscription.status === "active" && subscriptionExpiry >= now;

    if (hasActiveSubscription) {
      await logZahAccessAttempt({
        tenantId,
        userId: matchedMember.userId,
        memberId: matchedMember.memberId,
        eventNo,
        allowed: true,
        reason: null,
        accessType,
        payload,
      });

      return sendZahResponse(
        c,
        buildZahAllowedResponse({
          eventNo,
          memberName: matchedMember.memberName,
          graceMode: false,
        }),
      );
    }

    const graceDays = accessType === "door" ? getDoorGraceDays(tokenCheck.settings) : 0;
    const expiredDays = daysSince(subscriptionExpiry);

    if (graceDays > 0 && expiredDays <= graceDays) {
      await logZahAccessAttempt({
        tenantId,
        userId: matchedMember.userId,
        memberId: matchedMember.memberId,
        eventNo,
        allowed: true,
        reason: "grace_period",
        accessType,
        payload,
      });

      return sendZahResponse(
        c,
        buildZahAllowedResponse({
          eventNo,
          memberName: matchedMember.memberName,
          graceMode: true,
        }),
      );
    }

    const reason = "Membership expired";

    await logZahAccessAttempt({
      tenantId,
      userId: matchedMember.userId,
      memberId: matchedMember.memberId,
      eventNo,
      allowed: false,
      reason,
      accessType,
      payload,
    });

    return sendZahResponse(c, buildZahDeniedResponse(eventNo, reason));
  } catch (err) {
    console.error("Gate ZAH validation error:", err);
    return sendZahResponse(c, buildZahDeniedResponse(eventNo, "Validation failed"));
  }
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
    const tokenCheck = await verifyKioskToken(tenantId, providedToken);

    if (!tokenCheck.ok) {
      const payload = { valid: false, error: 8, tts: tokenCheck.reason };
      if (tokenCheck.status === 404) {
        return c.json(payload, 404);
      }
      return c.json(payload, 401);
    }

    const trimmedCardNo = cardNo.trim();
    const memberIdCandidates = Array.from(
      new Set([trimmedCardNo, trimmedCardNo.toUpperCase(), ...getCardCandidates(cardNo)]),
    ).filter(Boolean);
    const externalIdCandidates = getExternalIdCandidates(cardNo);
    const legacyLookup = getLegacyCardCandidates(cardNo);

    if (memberIdCandidates.length === 0 && externalIdCandidates.length === 0) {
      return c.json({ valid: false, error: 8, tts: "Not registered" });
    }

    let matchedMember:
      | {
          userId: string;
          memberId: string | null;
          memberName: string;
        }
      | null = null;

    for (const candidate of memberIdCandidates) {
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
            eq(tenantMemberships.member_id, candidate),
          ),
        )
        .limit(1);

      if (row) {
        matchedMember = row;
        break;
      }
    }

    if (!matchedMember) {
      for (const candidate of externalIdCandidates) {
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
              eq(tenantMemberships.external_id, candidate),
            ),
          )
          .limit(1);

        if (row) {
          matchedMember = row;
          break;
        }
      }
    }

    if (!matchedMember && legacyLookup.candidates.length > 0) {
      for (const candidate of legacyLookup.candidates) {
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
              or(
                eq(tenantMemberships.member_id, candidate),
                eq(tenantMemberships.external_id, candidate),
              ),
            ),
          )
          .limit(1);

        if (row) {
          matchedMember = row;
          break;
        }
      }
    }

    if (!matchedMember && legacyLookup.numericPart) {
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
            or(
              sql`regexp_replace(coalesce(${tenantMemberships.member_id}, ''), '[^0-9]', '', 'g') = ${legacyLookup.numericPart}`,
              sql`regexp_replace(coalesce(${tenantMemberships.external_id}, ''), '[^0-9]', '', 'g') = ${legacyLookup.numericPart}`,
            ),
          ),
        )
        .limit(1);

      if (row) {
        matchedMember = row;
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

// ─── POST /validate-qr — Kiosk QR/card validation with grace support ─────────

app.post("/validate-qr", zValidator("json", ValidateQrSchema), async (c) => {
  const { cardNo, tenantId } = c.req.valid("json");
  const providedToken = (c.req.header("X-Kiosk-Token") ?? "").trim();

  try {
    const tokenCheck = await verifyKioskToken(tenantId, providedToken);

    if (!tokenCheck.ok) {
      const payload = {
        valid: false,
        error: 8,
        tts: tokenCheck.reason,
        reason: tokenCheck.reason,
        memberName: "",
        expiryDate: null,
        daysRemaining: 0,
        graceMode: false,
        graceDaysRemaining: 0,
      };
      if (tokenCheck.status === 404) {
        return c.json(payload, 404);
      }
      return c.json(payload, 401);
    }

    const resolved = resolveMemberIdFromCardNo(cardNo);

    if (!resolved.memberId) {
      return c.json(
        {
          valid: false,
          error: 8,
          tts: resolved.reason ?? "Invalid card value",
          reason: resolved.reason ?? "Invalid card value",
          memberName: "",
          expiryDate: null,
          daysRemaining: 0,
          graceMode: false,
          graceDaysRemaining: 0,
        },
        400,
      );
    }

    const memberCandidates = Array.from(
      new Set([resolved.memberId, resolved.memberId.toUpperCase()]),
    );

    let matchedMember:
      | {
          userId: string;
          memberId: string | null;
          memberName: string;
        }
      | null = null;

    for (const candidate of memberCandidates) {
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
            eq(tenantMemberships.member_id, candidate),
          ),
        )
        .limit(1);

      if (row) {
        matchedMember = row;
        break;
      }
    }

    if (!matchedMember) {
      return c.json(
        {
          valid: false,
          error: 8,
          tts: "Not registered",
          reason: "Member not found",
          memberName: "",
          expiryDate: null,
          daysRemaining: 0,
          graceMode: false,
          graceDaysRemaining: 0,
        },
        404,
      );
    }

    const [latestSubscription] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.current_period_end,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenant_id, tenantId),
          eq(subscriptions.customer_id, matchedMember.userId),
        ),
      )
      .orderBy(desc(subscriptions.current_period_end))
      .limit(1);

    if (!latestSubscription) {
      return c.json(
        {
          valid: false,
          error: 8,
          tts: "Membership expired",
          reason: "No subscription found",
          memberName: matchedMember.memberName,
          expiryDate: null,
          daysRemaining: 0,
          graceMode: false,
          graceDaysRemaining: 0,
        },
        404,
      );
    }

    const expiryDate = latestSubscription.currentPeriodEnd;
    const expiredDays = daysSince(expiryDate);

    if (expiryDate >= new Date()) {
      return c.json({
        valid: true,
        error: 0,
        tts: "Membership active",
        reason: "Membership active",
        memberName: matchedMember.memberName,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: daysUntil(expiryDate),
        graceMode: false,
        graceDaysRemaining: 0,
      });
    }

    if (expiredDays <= QR_GRACE_DAYS) {
      return c.json({
        valid: true,
        error: 0,
        tts: "Membership grace period",
        reason: "Membership in grace period",
        memberName: matchedMember.memberName,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: 0,
        graceMode: true,
        graceDaysRemaining: QR_GRACE_DAYS - expiredDays,
      });
    }

    return c.json({
      valid: false,
      error: 8,
      tts: "Membership expired",
      reason: "Membership expired",
      memberName: matchedMember.memberName,
      expiryDate: expiryDate.toISOString(),
      daysRemaining: 0,
      graceMode: false,
      graceDaysRemaining: 0,
    });
  } catch (err) {
    console.error("Gate validate-qr error:", err);
    return c.json(
      {
        valid: false,
        error: 8,
        tts: "Validation failed",
        reason: "Validation failed",
        memberName: "",
        expiryDate: null,
        daysRemaining: 0,
        graceMode: false,
        graceDaysRemaining: 0,
      },
      500,
    );
  }
});

// ─── POST /zah* — Cloud-hosted ZAH2-compatible endpoint ────────────────────
// Supports:
//   /zah?tenant=<id>&token=<kioskToken>
//   /zah/:tenantId/:kioskToken
//   /zah/:tenantId/:kioskToken/tCheck
//   /zah/:tenantId/:kioskToken/zah3check
// Query:
//   ?type=door (default, grace enabled)
//   ?type=turnstile (strict, no grace)
app.post("/zah", handleZahValidation);
app.post("/zah/:tenantId/:kioskToken", handleZahValidation);
app.post("/zah/:tenantId/:kioskToken/tCheck", handleZahValidation);
app.post("/zah/:tenantId/:kioskToken/zah3check", handleZahValidation);

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

// ─── Serve avatar images ────────────────────────────────────────────────────
import { readFile } from "fs/promises";
import { join } from "path";

app.get("/avatars/:filename", async (c) => {
  const filename = c.req.param("filename");
  // Sanitize filename
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe.includes("..")) {
    return c.text("Not found", 404);
  }
  try {
    const filePath = join("/app/avatars", safe);
    const data = await readFile(filePath);
    const ext = safe.split(".").pop()?.toLowerCase();
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" } });
  } catch {
    return c.text("Not found", 404);
  }
});
