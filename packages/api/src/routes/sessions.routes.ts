import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import {
  sessionPackages,
  sessionCredits,
  sessionLogs,
  users,
} from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateSessionLogSchema } from "../lib/validation.js";
import * as SessionService from "../services/session.service.js";

const app = new Hono();

// GET /tenants/:tenantId/sessions/packages - list session packages
app.get("/packages", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(sessionPackages)
    .where(eq(sessionPackages.tenant_id, tenantId))
    .orderBy(desc(sessionPackages.created_at));
  return c.json(success(rows));
});

// GET /tenants/:tenantId/sessions/credits - list user's credits
app.get("/credits", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      credit: sessionCredits,
      package: {
        name: sessionPackages.name,
        sessionCount: sessionPackages.session_count,
      },
    })
    .from(sessionCredits)
    .leftJoin(
      sessionPackages,
      eq(sessionCredits.package_id, sessionPackages.id),
    )
    .where(
      and(
        eq(sessionCredits.tenant_id, tenantId),
        eq(sessionCredits.user_id, user.id),
      ),
    );
  return c.json(success(rows));
});

// GET /tenants/:tenantId/sessions/logs - list session logs (admin/staff)
app.get(
  "/logs",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select({
        log: sessionLogs,
        client: { name: users.name },
      })
      .from(sessionLogs)
      .leftJoin(users, eq(sessionLogs.client_id, users.id))
      .where(eq(sessionLogs.tenant_id, tenantId))
      .orderBy(desc(sessionLogs.created_at));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/sessions/logs - create session log
app.post(
  "/logs",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreateSessionLogSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const logId = await SessionService.createSessionLog({
        tenantId,
        clientId: body.clientId,
        coachId: user.id,
        bookingId: body.bookingId,
        creditId: body.creditId,
        sessionType: body.sessionType,
        notes: body.notes,
        exercises: body.exercises,
        metrics: body.metrics,
      });
      return c.json(success({ logId }), 201);
    } catch (err) {
      return c.json(error("SESSION_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as sessionsRouter };
