import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import crypto from "node:crypto";
import { db, generateId } from "@timeo/db";
import { apiKeys } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /api-keys — list (no key_hash returned)
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db
    .select({
      id: apiKeys.id,
      tenant_id: apiKeys.tenant_id,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      last_used_at: apiKeys.last_used_at,
      expires_at: apiKeys.expires_at,
      created_at: apiKeys.created_at,
    })
    .from(apiKeys);

  return c.json(success(rows));
});

// POST /api-keys — create key, return plaintext ONCE
app.post(
  "/",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100),
      tenant_id: z.string().optional(),
      permissions: z.array(z.string()).default([]),
      expires_at: z.string().datetime().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    // Generate plaintext key and hash
    const plaintext = `tmk_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto
      .createHash("sha256")
      .update(plaintext)
      .digest("hex");

    const id = generateId();
    await db.insert(apiKeys).values({
      id,
      name: body.name,
      tenant_id: body.tenant_id ?? null,
      key_hash: keyHash,
      permissions: body.permissions,
      expires_at: body.expires_at ? new Date(body.expires_at) : null,
    });

    await insertAudit(
      user.id,
      "platform_admin",
      "api_key.created",
      "api_key",
      id,
      { name: body.name },
      ip,
    );

    return c.json(
      success({
        id,
        name: body.name,
        key: plaintext, // returned ONCE
        permissions: body.permissions,
        created_at: new Date().toISOString(),
      }),
      201,
    );
  },
);

// DELETE /api-keys/:id — revoke
app.delete("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [existing] = await db
    .select({ id: apiKeys.id, name: apiKeys.name })
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  if (!existing) {
    return c.json(error("NOT_FOUND", "API key not found"), 404);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "api_key.revoked",
    "api_key",
    id,
    { name: existing.name },
    ip,
  );

  return c.json(success({ message: "API key revoked" }));
});

export { app as apiKeysRouter };
