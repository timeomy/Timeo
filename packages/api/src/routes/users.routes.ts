import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { users, account as authAccount } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /api/users/me — current user profile including force_password_reset flag
app.get("/me", authMiddleware, async (c) => {
  const authUser = c.get("user");

  const [appUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar_url: users.avatar_url,
      force_password_reset: users.force_password_reset,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!appUser) {
    return c.json(error("USER_NOT_FOUND", "User not found"), 404);
  }

  return c.json(success(appUser));
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/users/me/change-password — change password and clear force_password_reset flag
app.post(
  "/me/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const authUser = c.get("user");
    const { currentPassword, newPassword } = c.req.valid("json");

    // Verify current password against Better Auth account record
    const [accountRecord] = await db
      .select({ id: authAccount.id, password: authAccount.password })
      .from(authAccount)
      .where(eq(authAccount.userId, authUser.authId))
      .limit(1);

    if (!accountRecord?.password) {
      return c.json(error("NO_PASSWORD", "No password set for this account"), 400);
    }

    const { verifyPassword } = await import("better-auth/crypto");
    const isValid = await verifyPassword({ password: currentPassword, hash: accountRecord.password });

    if (!isValid) {
      return c.json(error("INVALID_PASSWORD", "Current password is incorrect"), 400);
    }

    // Hash new password and update
    const { hashPassword } = await import("better-auth/crypto");
    const newHash = await hashPassword(newPassword);

    await db
      .update(authAccount)
      .set({ password: newHash, updatedAt: new Date() })
      .where(eq(authAccount.id, accountRecord.id));

    // Clear the force_password_reset flag
    await db
      .update(users)
      .set({ force_password_reset: false, updated_at: new Date() })
      .where(eq(users.id, authUser.id));

    return c.json(success({ message: "Password changed successfully" }));
  },
);

// PATCH /api/users/me — update profile fields
app.patch("/me", authMiddleware, async (c) => {
  const authUser = c.get("user");
  const body = await c.req.json();

  const allowedFields: Record<string, any> = {};
  if (body.name !== undefined) allowedFields.name = body.name;
  if (body.phone !== undefined) allowedFields.phone = body.phone;
  if (body.avatar_url !== undefined) allowedFields.avatar_url = body.avatar_url;

  if (Object.keys(allowedFields).length === 0) {
    return c.json(error("NO_FIELDS", "No fields to update"), 400);
  }

  allowedFields.updated_at = new Date();

  await db.update(users)
    .set(allowedFields)
    .where(eq(users.id, authUser.id));

  const [updated] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar_url: users.avatar_url,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  return c.json(success(updated));
});

// POST /api/users/me/avatar — upload profile photo
app.post("/me/avatar", authMiddleware, async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;
  const body = await c.req.parseBody();
  const file = body["avatar"] as File;

  if (!file || !file.type.startsWith("image/")) {
    return c.json(error("INVALID_FILE", "Must be an image"), 400);
  }

  // Save to disk
  const filename = `${userId}.jpg`;
  const savePath = `/opt/timeo-website/avatars/${filename}`;
  const avatarUrl = `https://timeo.my/avatars/${filename}`;

  const bytes = await file.arrayBuffer();
  const fs = await import("fs/promises");
  await fs.mkdir("/opt/timeo-website/avatars", { recursive: true });
  await fs.writeFile(savePath, Buffer.from(bytes));

  // Update user avatar_url in DB
  await db.update(users)
    .set({ avatar_url: avatarUrl, updated_at: new Date() })
    .where(eq(users.id, userId));

  // Publish MQTT for face enrollment
  try {
    const mqtt = await import("mqtt");
    const client = mqtt.connect(process.env.MQTT_BROKER_URL || "mqtt://timeo-mqtt:1883");
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));
    client.publish(
      `${process.env.MQTT_TOPIC_PREFIX || "topic/face/manage"}/enroll`,
      JSON.stringify({
        userId,
        avatarUrl,
        action: "enroll",
        timestamp: new Date().toISOString(),
      })
    );
    client.end();
  } catch (mqttErr) {
    console.warn("MQTT face enrollment publish failed:", mqttErr);
  }

  return c.json(success({ avatar_url: avatarUrl }));
});

export { app as usersRouter };
