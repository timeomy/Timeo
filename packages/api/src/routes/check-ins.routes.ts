import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { checkIns, users } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateCheckInSchema } from "../lib/validation.js";
import * as CheckInService from "../services/check-in.service.js";

const app = new Hono();

// GET /tenants/:tenantId/check-ins
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select({
        checkIn: checkIns,
        user: { name: users.name, email: users.email },
      })
      .from(checkIns)
      .leftJoin(users, eq(checkIns.user_id, users.id))
      .where(eq(checkIns.tenant_id, tenantId))
      .orderBy(desc(checkIns.timestamp));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/check-ins
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreateCheckInSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const checkInId = await CheckInService.createCheckIn({
        tenantId,
        userId: body.userId,
        method: body.method,
        checkedInBy: user.id,
      });
      return c.json(success({ checkInId }), 201);
    } catch (err) {
      return c.json(error("CHECKIN_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as checkInsRouter };
