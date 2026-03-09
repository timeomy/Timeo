import { Hono } from "hono";
import { db } from "@timeo/db";
import { tenants } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "../../lib/response.js";
import * as CheckInService from "../../services/check-in.service.js";
import * as AccessControl from "../../services/access-control.service.js";
import type { FaceCapturePayload } from "../../services/access-control.service.js";

const app = new Hono();

// ─── Legacy endpoint: simple check-in via userId + method ───────────────────
// POST /webhooks/door/:tenantSlug/check-in
// Called by QR/NFC hardware with { userId, method }
app.post("/:tenantSlug/check-in", async (c) => {
  const slug = c.req.param("tenantSlug");
  const body = await c.req.json();

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (!tenant) return c.json(error("NOT_FOUND", "Tenant not found"), 404);

  if (!body.userId || !body.method) {
    return c.json(error("BAD_REQUEST", "userId and method required"), 400);
  }

  try {
    const checkInId = await CheckInService.createCheckIn({
      tenantId: tenant.id,
      userId: body.userId,
      method: body.method,
    });
    return c.json(success({ checkInId }), 201);
  } catch (err) {
    return c.json(error("CHECKIN_ERROR", (err as Error).message), 422);
  }
});

// ─── Face Capture Webhook (Turnstile Device Protocol) ───────────────────────
// POST /webhooks/door/:tenantSlug/face-capture
// Called by the face recognition turnstile device when it captures a face.
// The device sends its proprietary JSON protocol (cmd: "face").
// We must ALWAYS respond with ACK — the device will retry endlessly if we don't.
app.post("/:tenantSlug/face-capture", async (c) => {
  const slug = c.req.param("tenantSlug");

  let payload: FaceCapturePayload;
  try {
    payload = await c.req.json();
  } catch {
    // Device sent invalid JSON — still try to ACK to prevent retry loop
    return c.json({ reply: "ACK", cmd: "face", code: 0 });
  }

  // Validate this is a face capture event
  if (payload.cmd !== "face") {
    return c.json({ reply: "ACK", cmd: payload.cmd ?? "unknown", code: 0 });
  }

  const sequenceNo = payload.sequence_no ?? 0;
  const capTime = payload.cap_time ?? "";
  const deviceSn = payload.device_sn ?? "";
  const matchResult = payload.match_result ?? 0;

  // ── 1. Find tenant ──────────────────────────────────────────────────────
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    // Unknown tenant — ACK anyway to prevent device loop
    return c.json(
      AccessControl.buildDeviceResponse({
        allowed: false,
        sequenceNo,
        capTime,
        personId: null,
        memberName: null,
        denyReason: "unknown_tenant",
      }),
    );
  }

  // ── 2. Stranger detection (no match on device) ─────────────────────────
  if (matchResult <= 0) {
    await AccessControl.logAccessAttempt({
      tenantId: tenant.id,
      deviceSn,
      userId: null,
      personIdFromDevice: null,
      matchScore: matchResult,
      matchResult: "stranger",
      denyReason: "face_not_recognized",
      sequenceNo,
      capTime,
      rawData: sanitizeRawData(payload),
    });

    return c.json(
      AccessControl.buildDeviceResponse({
        allowed: false,
        sequenceNo,
        capTime,
        personId: null,
        memberName: null,
        denyReason: "face_not_recognized",
      }),
    );
  }

  // ── 3. Face matched — look up who this person is ───────────────────────
  const devicePersonId = payload.match?.person_id ?? "";
  const devicePersonName = payload.match?.person_name ?? "";

  const registration = await AccessControl.findFaceRegistration(
    deviceSn,
    devicePersonId,
  );

  if (!registration) {
    // Device recognized a face but we don't have it in our DB
    // This can happen if someone registered directly on the device
    await AccessControl.logAccessAttempt({
      tenantId: tenant.id,
      deviceSn,
      userId: null,
      personIdFromDevice: devicePersonId,
      matchScore: matchResult,
      matchResult: "denied",
      denyReason: "registration_not_found",
      sequenceNo,
      capTime,
      rawData: sanitizeRawData(payload),
    });

    return c.json(
      AccessControl.buildDeviceResponse({
        allowed: false,
        sequenceNo,
        capTime,
        personId: devicePersonId,
        memberName: devicePersonName,
        denyReason: "registration_not_found",
      }),
    );
  }

  const userId = registration.faceReg.user_id;
  const memberName = registration.userName ?? devicePersonName;

  // ── 4. Validate membership & subscription ──────────────────────────────
  const validation = await AccessControl.validateMemberAccess(
    tenant.id,
    userId,
  );

  if (!validation.allowed) {
    await AccessControl.logAccessAttempt({
      tenantId: tenant.id,
      deviceSn,
      userId,
      personIdFromDevice: devicePersonId,
      matchScore: matchResult,
      matchResult: "denied",
      denyReason: validation.reason,
      sequenceNo,
      capTime,
      rawData: sanitizeRawData(payload),
    });

    return c.json(
      AccessControl.buildDeviceResponse({
        allowed: false,
        sequenceNo,
        capTime,
        personId: devicePersonId,
        memberName,
        denyReason: validation.reason,
      }),
    );
  }

  // ── 5. Access granted — open the gate ──────────────────────────────────
  await AccessControl.logAccessAttempt({
    tenantId: tenant.id,
    deviceSn,
    userId,
    personIdFromDevice: devicePersonId,
    matchScore: matchResult,
    matchResult: "allowed",
    denyReason: null,
    sequenceNo,
    capTime,
    rawData: sanitizeRawData(payload),
  });

  // Create a check-in record
  await AccessControl.createFaceCheckIn(tenant.id, userId);

  return c.json(
    AccessControl.buildDeviceResponse({
      allowed: true,
      sequenceNo,
      capTime,
      personId: devicePersonId,
      memberName,
    }),
  );
});

// ─── Heartbeat endpoint ─────────────────────────────────────────────────────
// POST /webhooks/door/:tenantSlug/heartbeat
// The device sends periodic heartbeats when in configuration client mode.
// We simply ACK with no business commands (or could piggyback commands here).
app.post("/:tenantSlug/heartbeat", async (c) => {
  const body = await c.req.json();
  return c.json({
    reply: "ACK",
    cmd: "heartbeat",
    code: 0,
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip base64 image data from raw payload before storing (saves DB space) */
function sanitizeRawData(
  payload: FaceCapturePayload,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...payload };

  // Remove large image blobs
  if (sanitized.overall_pic) {
    sanitized.overall_pic = { flag: true, data: "[stripped]" };
  }
  if (sanitized.closeup_pic) {
    sanitized.closeup_pic = { flag: true, data: "[stripped]" };
  }
  if (sanitized.match && typeof sanitized.match === "object") {
    const match = { ...(sanitized.match as Record<string, unknown>) };
    if (match.image) match.image = "[stripped]";
    sanitized.match = match;
  }

  return sanitized;
}

export { app as doorWebhookRouter };
