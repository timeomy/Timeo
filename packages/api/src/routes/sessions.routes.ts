import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  sessionPackages,
  sessionCredits,
  sessionLogs,
  users,
  tenantMemberships,
} from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateSessionLogSchema } from "../lib/validation.js";
import * as SessionService from "../services/session.service.js";

const app = new Hono();

// ── alias tables for coach join ──────────────────────────────────────────────
import { alias } from "drizzle-orm/pg-core";
const coachUsers = alias(users, "coach");

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
        id: sessionLogs.id,
        tenantId: sessionLogs.tenant_id,
        clientId: sessionLogs.client_id,
        coachId: sessionLogs.coach_id,
        bookingId: sessionLogs.booking_id,
        creditId: sessionLogs.credit_id,
        sessionType: sessionLogs.session_type,
        notes: sessionLogs.notes,
        exercises: sessionLogs.exercises,
        metrics: sessionLogs.metrics,
        createdAt: sessionLogs.created_at,
        clientName: users.name,
        clientEmail: users.email,
        coachName: coachUsers.name,
      })
      .from(sessionLogs)
      .leftJoin(users, eq(sessionLogs.client_id, users.id))
      .leftJoin(coachUsers, eq(sessionLogs.coach_id, coachUsers.id))
      .where(eq(sessionLogs.tenant_id, tenantId))
      .orderBy(desc(sessionLogs.created_at));

    const flattened = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      clientId: r.clientId,
      coachId: r.coachId,
      bookingId: r.bookingId,
      creditId: r.creditId,
      sessionType: r.sessionType,
      notes: r.notes,
      exercises: (r.exercises as unknown[]) ?? [],
      metrics: r.metrics as Record<string, unknown> | null,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      clientName: r.clientName ?? "Unknown",
      clientEmail: r.clientEmail ?? null,
      coachName: r.coachName ?? "Unknown",
    }));

    return c.json(success(flattened));
  },
);

// POST /tenants/:tenantId/sessions/logs - create session log
// Accepts either clientId (user ID) OR clientEmail (we look up the user)
const FlexibleSessionLogSchema = CreateSessionLogSchema.extend({
  clientId: z.string().optional(),
  clientEmail: z.string().email().optional(),
}).refine((d) => d.clientId || d.clientEmail, {
  message: "Either clientId or clientEmail is required",
  path: ["clientId"],
});

app.post(
  "/logs",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", FlexibleSessionLogSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      let clientId = body.clientId;

      // If no clientId, look up by email within this tenant
      if (!clientId && body.clientEmail) {
        const [found] = await db
          .select({ id: users.id })
          .from(users)
          .innerJoin(tenantMemberships, eq(users.id, tenantMemberships.user_id))
          .where(
            and(
              eq(users.email, body.clientEmail),
              eq(tenantMemberships.tenant_id, tenantId),
            ),
          )
          .limit(1);

        if (!found) {
          return c.json(
            error("CLIENT_NOT_FOUND", `No member found with email ${body.clientEmail}`),
            404,
          );
        }
        clientId = found.id;
      }

      if (!clientId) {
        return c.json(error("CLIENT_REQUIRED", "clientId or clientEmail is required"), 422);
      }

      const logId = await SessionService.createSessionLog({
        tenantId,
        clientId,
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

// DELETE /tenants/:tenantId/sessions/logs/:logId
app.delete(
  "/logs/:logId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const logId = c.req.param("logId");
    const user = c.get("user");

    try {
      const [log] = await db
        .select({ id: sessionLogs.id, coachId: sessionLogs.coach_id })
        .from(sessionLogs)
        .where(
          and(
            eq(sessionLogs.id, logId),
            eq(sessionLogs.tenant_id, tenantId),
          ),
        )
        .limit(1);

      if (!log) {
        return c.json(error("NOT_FOUND", "Session log not found"), 404);
      }

      await db
        .delete(sessionLogs)
        .where(eq(sessionLogs.id, logId));

      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(error("SESSION_DELETE_ERROR", (err as Error).message), 500);
    }
  },
);


// GET /tenants/:tenantId/sessions/me/training-logs - member's own published training logs
app.get("/me/training-logs", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");

  try {
    const rows = await db
      .select({
        id: sessionLogs.id,
        tenantId: sessionLogs.tenant_id,
        sessionType: sessionLogs.session_type,
        notes: sessionLogs.notes,
        exercises: sessionLogs.exercises,
        trainingTypes: sessionLogs.training_types,
        publishedAt: sessionLogs.published_at,
        createdAt: sessionLogs.created_at,
        coachName: coachUsers.name,
        coachEmail: coachUsers.email,
      })
      .from(sessionLogs)
      .leftJoin(coachUsers, eq(sessionLogs.coach_id, coachUsers.id))
      .where(
        and(
          eq(sessionLogs.tenant_id, tenantId),
          eq(sessionLogs.client_id, user.id),
          eq(sessionLogs.published, true),
        ),
      )
      .orderBy(desc(sessionLogs.created_at))
      .limit(10);

    const result = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      sessionType: r.sessionType,
      notes: r.notes ?? null,
      exercises: (r.exercises as unknown[]) ?? [],
      trainingTypes: (r.trainingTypes as string[]) ?? [],
      date: r.publishedAt?.toISOString() ?? r.createdAt?.toISOString() ?? new Date().toISOString(),
      coachName: r.coachName ?? null,
      coachEmail: r.coachEmail ?? null,
    }));

    return c.json(success(result));
  } catch (err) {
    return c.json(error("TRAINING_LOGS_ERROR", (err as Error).message), 500);
  }
});

// GET /tenants/:tenantId/sessions/me/coach - member's assigned coach info
app.get("/me/coach", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");

  try {
    const [membership] = await db
      .select({
        coachId: tenantMemberships.coach_id,
        coachName: coachUsers.name,
        coachEmail: coachUsers.email,
      })
      .from(tenantMemberships)
      .leftJoin(coachUsers, eq(tenantMemberships.coach_id, coachUsers.id))
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, user.id),
        ),
      )
      .limit(1);

    if (!membership || !membership.coachId) {
      return c.json(success(null));
    }

    return c.json(
      success({
        id: membership.coachId,
        name: membership.coachName ?? "Your Coach",
        email: membership.coachEmail ?? null,
        avatarUrl: null,
      }),
    );
  } catch (err) {
    return c.json(error("COACH_ERROR", (err as Error).message), 500);
  }
});


export { app as sessionsRouter };
