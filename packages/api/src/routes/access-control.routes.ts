import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  turnstileDevices,
  faceRegistrations,
  accessLogs,
  users,
} from "@timeo/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as MqttService from "../services/mqtt.service.js";

const app = new Hono();

// All routes require authentication + tenant context
app.use("*", authMiddleware, tenantMiddleware);

// ─── Device Management ──────────────────────────────────────────────────────

const CreateDeviceSchema = z.object({
  deviceSn: z.string().min(1).max(32),
  name: z.string().min(1).max(96),
  mqttTopic: z.string().optional(),
  httpPushUrl: z.string().url().optional(),
  matchMode: z.enum(["online", "auto", "offline_fallback"]).default("offline_fallback"),
});

// GET /access-control/devices — List turnstile devices
app.get("/devices", requireRole("admin", "staff"), async (c) => {
  const tenantId = c.get("tenantId");
  const devices = await db
    .select()
    .from(turnstileDevices)
    .where(eq(turnstileDevices.tenant_id, tenantId))
    .orderBy(desc(turnstileDevices.created_at));
  return c.json(success(devices));
});

// POST /access-control/devices — Register a new turnstile device
app.post(
  "/devices",
  requireRole("admin"),
  zValidator("json", CreateDeviceSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Check if device_sn already exists
    const [existing] = await db
      .select()
      .from(turnstileDevices)
      .where(eq(turnstileDevices.device_sn, body.deviceSn))
      .limit(1);

    if (existing) {
      return c.json(error("DUPLICATE", "Device with this serial number already exists"), 409);
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

// ─── Face Registration ──────────────────────────────────────────────────────

const FaceRegisterSchema = z.object({
  userId: z.string().min(1),
  faceImage: z.string().min(1), // base64 encoded JPEG
});

// POST /access-control/face-register — Register a member's face on all tenant devices
app.post(
  "/face-register",
  requireRole("admin", "staff", "customer"),
  zValidator("json", FaceRegisterSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Get user info
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (!user) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Get all active devices for this tenant
    const devices = await db
      .select()
      .from(turnstileDevices)
      .where(
        and(
          eq(turnstileDevices.tenant_id, tenantId),
          eq(turnstileDevices.status, "active"),
        ),
      );

    if (devices.length === 0) {
      return c.json(error("NO_DEVICES", "No active turnstile devices for this tenant"), 404);
    }

    // Use Timeo user ID as device_person_id (truncated to 19 chars — device limit)
    const devicePersonId = user.id.slice(0, 19);
    const results: Array<{ deviceSn: string; status: string; error?: string }> = [];

    for (const device of devices) {
      const regId = generateId();

      try {
        // Create face registration record (pending)
        await db.insert(faceRegistrations).values({
          id: regId,
          tenant_id: tenantId,
          user_id: body.userId,
          device_person_id: devicePersonId,
          device_sn: device.device_sn,
          status: "pending",
          face_image_url: null, // TODO: store in file storage
        });

        // Send to device via MQTT
        if (device.mqtt_topic && MqttService.isConnected()) {
          const response = await MqttService.registerFaceOnDevice({
            mqttTopic: device.mqtt_topic,
            personId: devicePersonId,
            personName: user.name ?? "Member",
            faceImageBase64: body.faceImage,
          });

          if (response.code === 0) {
            // Sync success
            await db
              .update(faceRegistrations)
              .set({ status: "synced", synced_at: new Date() })
              .where(eq(faceRegistrations.id, regId));
            results.push({ deviceSn: device.device_sn, status: "synced" });
          } else {
            // Device returned an error
            await db
              .update(faceRegistrations)
              .set({ status: "failed" })
              .where(eq(faceRegistrations.id, regId));
            results.push({
              deviceSn: device.device_sn,
              status: "failed",
              error: `Device error code: ${response.code}`,
            });
          }
        } else {
          // MQTT not available — leave as pending for later sync
          results.push({
            deviceSn: device.device_sn,
            status: "pending",
            error: "MQTT not connected — will sync later",
          });
        }
      } catch (err) {
        // Update status to failed
        await db
          .update(faceRegistrations)
          .set({ status: "failed" })
          .where(eq(faceRegistrations.id, regId));
        results.push({
          deviceSn: device.device_sn,
          status: "failed",
          error: (err as Error).message,
        });
      }
    }

    return c.json(success({ userId: body.userId, devicePersonId, devices: results }), 201);
  },
);

// DELETE /access-control/face-register/:userId — Remove a member's face from all devices
app.delete(
  "/face-register/:userId",
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
      return c.json(error("NOT_FOUND", "No face registrations found"), 404);
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

// GET /access-control/face-registrations — List all face registrations
app.get("/face-registrations", requireRole("admin", "staff"), async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      faceReg: faceRegistrations,
      userName: users.name,
      userEmail: users.email,
    })
    .from(faceRegistrations)
    .leftJoin(users, eq(faceRegistrations.user_id, users.id))
    .where(eq(faceRegistrations.tenant_id, tenantId))
    .orderBy(desc(faceRegistrations.registered_at));
  return c.json(success(rows));
});

// ─── Access Logs ────────────────────────────────────────────────────────────

// GET /access-control/access-logs — View access attempt history
app.get("/access-logs", requireRole("admin", "staff"), async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      log: accessLogs,
      userName: users.name,
    })
    .from(accessLogs)
    .leftJoin(users, eq(accessLogs.user_id, users.id))
    .where(eq(accessLogs.tenant_id, tenantId))
    .orderBy(desc(accessLogs.created_at))
    .limit(100);
  return c.json(success(rows));
});

export { app as accessControlRouter };
