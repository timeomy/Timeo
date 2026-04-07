import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { generateId } from "@timeo/db";
import {
  turnstileDevices,
  faceRegistrations,
  accessLogs,
  users,
} from "@timeo/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as MqttService from "../services/mqtt.service.js";
import * as AccessControl from "../services/access-control.service.js";
import type { FaceCapturePayload } from "../services/access-control.service.js";

const app = new Hono();

// ─── Webhook (no auth — device pushes access events) ───────────────────────
// POST /turnstile/webhook
// Validated via X-Device-Key header matching GYM_DEVICE_KEY_SECRET env var.

app.post(
  "/webhook",
  zValidator(
    "json",
    z.object({
      cmd: z.string(),
      device_sn: z.string(),
      sequence_no: z.number().optional(),
      cap_time: z.string().optional(),
      match_result: z.number().optional(),
      match: z
        .object({
          person_id: z.string().optional(),
          person_name: z.string().optional(),
          person_role: z.number().optional(),
        })
        .passthrough()
        .optional(),
    }).passthrough(),
  ),
  async (c) => {
    // Validate device key
    const deviceKey = c.req.header("X-Device-Key");
    const expectedKey = process.env.GYM_DEVICE_KEY_SECRET;

    if (!expectedKey || deviceKey !== expectedKey) {
      return c.json(error("UNAUTHORIZED", "Invalid device key"), 401);
    }

    const payload = c.req.valid("json") as FaceCapturePayload;

    // Non-face commands get a simple ACK
    if (payload.cmd !== "face") {
      return c.json({ reply: "ACK", cmd: payload.cmd ?? "unknown", code: 0 });
    }

    const sequenceNo = payload.sequence_no ?? 0;
    const capTime = payload.cap_time ?? "";
    const deviceSn = payload.device_sn ?? "";
    const matchResult = payload.match_result ?? 0;

    // Look up the device to find the tenant
    const device = await AccessControl.findDeviceBySerialNumber(deviceSn);

    if (!device) {
      return c.json(
        AccessControl.buildDeviceResponse({
          allowed: false,
          sequenceNo,
          capTime,
          personId: null,
          memberName: null,
          denyReason: "unknown_device",
        }),
      );
    }

    const tenantId = device.tenant_id;

    // Stranger detection (no match on device)
    if (matchResult <= 0) {
      await AccessControl.logAccessAttempt({
        tenantId,
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

    // Face matched — look up registration
    const devicePersonId = payload.match?.person_id ?? "";
    const devicePersonName = payload.match?.person_name ?? "";

    const registration = await AccessControl.findFaceRegistration(
      deviceSn,
      devicePersonId,
    );

    if (!registration) {
      await AccessControl.logAccessAttempt({
        tenantId,
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

    // Validate membership & subscription
    const validation = await AccessControl.validateMemberAccess(
      tenantId,
      userId,
    );

    if (!validation.allowed) {
      await AccessControl.logAccessAttempt({
        tenantId,
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

    // Access granted — open the gate
    await AccessControl.logAccessAttempt({
      tenantId,
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

    await AccessControl.createFaceCheckIn(tenantId, userId);

    return c.json(
      AccessControl.buildDeviceResponse({
        allowed: true,
        sequenceNo,
        capTime,
        personId: devicePersonId,
        memberName,
      }),
    );
  },
);

// ─── Authenticated routes (tenant-scoped) ──────────────────────────────────

// POST /turnstile — Register a new device
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator(
    "json",
    z.object({
      deviceSn: z.string().min(1).max(32),
      name: z.string().min(1).max(96),
      mqttTopic: z.string().optional(),
      httpPushUrl: z.string().url().optional(),
      matchMode: z
        .enum(["online", "auto", "offline_fallback"])
        .default("offline_fallback"),
    }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Check for duplicate device_sn
    const [existing] = await db
      .select()
      .from(turnstileDevices)
      .where(eq(turnstileDevices.device_sn, body.deviceSn))
      .limit(1);

    if (existing) {
      return c.json(
        error("DUPLICATE", "Device with this serial number already exists"),
        409,
      );
    }

    const deviceId = generateId();
    await db.insert(turnstileDevices).values({
      id: deviceId,
      tenant_id: tenantId,
      device_sn: body.deviceSn,
      name: body.name,
      mqtt_topic: body.mqttTopic ?? null,
      http_push_url: body.httpPushUrl ?? null,
      match_mode: body.matchMode,
    });

    return c.json(success({ id: deviceId, deviceSn: body.deviceSn }), 201);
  },
);

// GET /turnstile — List devices for tenant with face registration counts
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");

    const devices = await db
      .select({
        device: turnstileDevices,
        faceCount: sql<number>`cast(count(${faceRegistrations.id}) as int)`,
      })
      .from(turnstileDevices)
      .leftJoin(
        faceRegistrations,
        and(
          eq(faceRegistrations.device_sn, turnstileDevices.device_sn),
          eq(faceRegistrations.status, "synced"),
        ),
      )
      .where(eq(turnstileDevices.tenant_id, tenantId))
      .groupBy(turnstileDevices.id)
      .orderBy(desc(turnstileDevices.created_at));

    return c.json(success(devices));
  },
);

// POST /turnstile/enroll — Enroll a member's face on a specific device
app.post(
  "/enroll",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator(
    "json",
    z.object({
      userId: z.string().min(1),
      deviceSn: z.string().min(1),
      faceImageBase64: z.string().min(1),
    }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Verify device belongs to this tenant
    const [device] = await db
      .select()
      .from(turnstileDevices)
      .where(
        and(
          eq(turnstileDevices.tenant_id, tenantId),
          eq(turnstileDevices.device_sn, body.deviceSn),
        ),
      )
      .limit(1);

    if (!device) {
      return c.json(error("NOT_FOUND", "Device not found for this tenant"), 404);
    }

    // Get user info
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (!user) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Use Timeo user ID as device_person_id (truncated to 19 chars — device limit)
    const devicePersonId = user.id.slice(0, 19);
    const regId = generateId();

    // Create face registration record (pending)
    await db.insert(faceRegistrations).values({
      id: regId,
      tenant_id: tenantId,
      user_id: body.userId,
      device_person_id: devicePersonId,
      device_sn: body.deviceSn,
      status: "pending",
      face_image_url: null,
    });

    // Send to device via MQTT
    if (device.mqtt_topic && MqttService.isConnected()) {
      try {
        const response = await MqttService.registerFaceOnDevice({
          mqttTopic: device.mqtt_topic,
          personId: devicePersonId,
          personName: user.name ?? "Member",
          faceImageBase64: body.faceImageBase64,
        });

        if (response.code === 0) {
          await db
            .update(faceRegistrations)
            .set({ status: "synced", synced_at: new Date() })
            .where(eq(faceRegistrations.id, regId));

          return c.json(
            success({
              id: regId,
              userId: body.userId,
              deviceSn: body.deviceSn,
              devicePersonId,
              status: "synced",
            }),
            201,
          );
        }

        // Device returned an error
        await db
          .update(faceRegistrations)
          .set({ status: "failed" })
          .where(eq(faceRegistrations.id, regId));

        return c.json(
          success({
            id: regId,
            userId: body.userId,
            deviceSn: body.deviceSn,
            devicePersonId,
            status: "failed",
            error: `Device error code: ${response.code}`,
          }),
          201,
        );
      } catch (err) {
        await db
          .update(faceRegistrations)
          .set({ status: "failed" })
          .where(eq(faceRegistrations.id, regId));

        return c.json(
          error("ENROLL_FAILED", (err as Error).message),
          500,
        );
      }
    }

    // MQTT not available — leave as pending for later sync
    return c.json(
      success({
        id: regId,
        userId: body.userId,
        deviceSn: body.deviceSn,
        devicePersonId,
        status: "pending",
        error: "MQTT not connected — will sync later",
      }),
      201,
    );
  },
);

// DELETE /turnstile/enroll/:userId — Remove face enrollment for a user
app.delete(
  "/enroll/:userId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const userId = c.req.param("userId");

    // Find all face registrations for this user+tenant
    const registrations = await db
      .select({
        faceReg: faceRegistrations,
        mqttTopic: turnstileDevices.mqtt_topic,
      })
      .from(faceRegistrations)
      .leftJoin(
        turnstileDevices,
        eq(faceRegistrations.device_sn, turnstileDevices.device_sn),
      )
      .where(
        and(
          eq(faceRegistrations.tenant_id, tenantId),
          eq(faceRegistrations.user_id, userId),
        ),
      );

    if (registrations.length === 0) {
      return c.json(error("NOT_FOUND", "No face registrations found for this user"), 404);
    }

    for (const reg of registrations) {
      // Send delete to device via MQTT
      if (reg.mqttTopic && MqttService.isConnected()) {
        try {
          await MqttService.deleteFaceFromDevice({
            mqttTopic: reg.mqttTopic,
            personId: reg.faceReg.device_person_id,
          });
        } catch {
          // Log but don't fail — mark as deleted anyway
        }
      }

      // Mark as deleted
      await db
        .update(faceRegistrations)
        .set({ status: "deleted" })
        .where(eq(faceRegistrations.id, reg.faceReg.id));
    }

    return c.json(success({ deleted: registrations.length }));
  },
);

// POST /turnstile/door/open — Manually open the door via MQTT
app.post(
  "/door/open",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator(
    "json",
    z.object({
      deviceSn: z.string().min(1),
    }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Verify device belongs to this tenant
    const [device] = await db
      .select()
      .from(turnstileDevices)
      .where(
        and(
          eq(turnstileDevices.tenant_id, tenantId),
          eq(turnstileDevices.device_sn, body.deviceSn),
        ),
      )
      .limit(1);

    if (!device) {
      return c.json(error("NOT_FOUND", "Device not found for this tenant"), 404);
    }

    if (!device.mqtt_topic) {
      return c.json(
        error("NO_MQTT", "Device has no MQTT topic configured"),
        422,
      );
    }

    if (!MqttService.isConnected()) {
      return c.json(error("MQTT_OFFLINE", "MQTT broker is not connected"), 503);
    }

    try {
      const response = await MqttService.sendDoorOpenCommand({
        mqttTopic: device.mqtt_topic,
      });

      return c.json(
        success({
          deviceSn: body.deviceSn,
          status: response.code === 0 ? "opened" : "failed",
          deviceResponse: response,
        }),
      );
    } catch (err) {
      return c.json(
        error("DOOR_OPEN_FAILED", (err as Error).message),
        500,
      );
    }
  },
);

// GET /turnstile/logs — Access logs for tenant
app.get(
  "/logs",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");

    const rows = await db
      .select({
        log: accessLogs,
        userName: users.name,
        userEmail: users.email,
      })
      .from(accessLogs)
      .leftJoin(users, eq(accessLogs.user_id, users.id))
      .where(eq(accessLogs.tenant_id, tenantId))
      .orderBy(desc(accessLogs.created_at))
      .limit(100);

    return c.json(success(rows));
  },
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip base64 image data from raw payload before storing (saves DB space) */
function sanitizeRawData(
  payload: FaceCapturePayload,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...payload };

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

export { app as turnstileRouter };
