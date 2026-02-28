import { Hono } from "hono";
import { db } from "@timeo/db";
import { tenants } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "../../lib/response.js";
import * as CheckInService from "../../services/check-in.service.js";

const app = new Hono();

// POST /webhooks/door/:tenantSlug/face-capture
// Called by door/NFC hardware when a face is recognized
app.post("/:tenantSlug/face-capture", async (c) => {
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

export { app as doorWebhookRouter };
