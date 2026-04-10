import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { sessionLogs, tenantMemberships, users } from "@timeo/db/schema";
import {
  SESSION_LOG_FEEDBACK_OPTIONS,
  SESSION_LOG_TYPE_VALUES,
  type SessionLogType,
} from "@timeo/shared";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();
const coachUsers = alias(users, "session_log_coach_users");

const SessionTypeSchema = z.union([
  z.enum(SESSION_LOG_TYPE_VALUES),
  z.literal("pt"),
  z.literal("group"),
]);

const ExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  weight: z.number().optional(),
  notes: z.string().max(500).optional(),
});

const CreateSessionLogSchema = z.object({
  clientId: z.string().min(1),
  sessionType: SessionTypeSchema,
  duration: z.number().int().min(1).max(600).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  notes: z.string().max(5000).optional(),
  exercises: z.array(ExerciseSchema).optional(),
  clientFeedback: z.enum(SESSION_LOG_FEEDBACK_OPTIONS).optional(),
  customSessionType: z.string().trim().max(120).optional(),
  photoUrl: z.string().max(2_000_000).optional(),
  metrics: z.record(z.unknown()).optional(),
  date: z.string().optional(),
  coachId: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.sessionType === "custom" && !value.customSessionType?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customSessionType"],
      message: "customSessionType is required when sessionType is custom",
    });
  }

  if (
    typeof value.duration !== "number" &&
    typeof value.durationMinutes !== "number"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["duration"],
      message: "duration is required",
    });
  }
});

function normalizeSessionType(
  type: z.infer<typeof SessionTypeSchema>,
): SessionLogType {
  if (type === "pt") return "personal_training";
  if (type === "group") return "group_class";
  return type;
}

function parseSessionDate(input?: string): Date | null {
  if (!input) return new Date();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function extractDurationMinutes(metrics: unknown): number | null {
  if (!metrics || typeof metrics !== "object") return null;

  const record = metrics as Record<string, unknown>;
  const value = record.durationMinutes;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  return null;
}

function resolveDurationMinutes(input: z.infer<typeof CreateSessionLogSchema>): number {
  if (typeof input.durationMinutes === "number") {
    return Math.max(1, Math.round(input.durationMinutes));
  }

  if (typeof input.duration === "number") {
    return Math.max(1, Math.round(input.duration));
  }

  const metricDuration =
    input.metrics && typeof input.metrics === "object"
      ? (input.metrics as Record<string, unknown>).durationMinutes
      : undefined;

  if (typeof metricDuration === "number" && Number.isFinite(metricDuration)) {
    return Math.max(1, Math.round(metricDuration));
  }

  return 60;
}

function extractStringMetric(metrics: unknown, key: string): string | null {
  if (!metrics || typeof metrics !== "object") return null;

  const value = (metrics as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;

  return value;
}

function buildMetrics(
  input: z.infer<typeof CreateSessionLogSchema>,
  durationMinutes: number,
): Record<string, unknown> {
  const metrics =
    input.metrics && typeof input.metrics === "object"
      ? { ...(input.metrics as Record<string, unknown>) }
      : {};

  metrics.durationMinutes = durationMinutes;

  if (input.clientFeedback) {
    metrics.clientFeedback = input.clientFeedback;
  }
  if (input.customSessionType?.trim()) {
    metrics.customSessionType = input.customSessionType.trim();
  }
  if (input.photoUrl?.trim()) {
    metrics.photoUrl = input.photoUrl.trim();
  }

  return metrics;
}

// POST /session-logs — create a coach session log
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator("json", CreateSessionLogSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const body = c.req.valid("json");

    const sessionDate = parseSessionDate(body.date);
    if (!sessionDate) {
      return c.json(error("BAD_REQUEST", "Invalid date format"), 400);
    }

    const effectiveCoachId =
      tenantRole === "coach" ? user.id : (body.coachId ?? user.id);

    try {
      const [clientMembership] = await db
        .select({
          id: tenantMemberships.id,
          coachId: tenantMemberships.coach_id,
        })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, body.clientId),
            eq(tenantMemberships.status, "active"),
          ),
        )
        .limit(1);

      if (!clientMembership) {
        return c.json(error("NOT_FOUND", "Client not found in this tenant"), 404);
      }

      if (tenantRole === "coach" && clientMembership.coachId !== user.id) {
        return c.json(
          error("FORBIDDEN", "You can only log sessions for your assigned clients"),
          403,
        );
      }

      const normalizedSessionType = normalizeSessionType(body.sessionType);
      const durationMinutes = resolveDurationMinutes(body);
      const metrics = buildMetrics(body, durationMinutes);

      const id = generateId();
      await db.insert(sessionLogs).values({
        id,
        tenant_id: tenantId,
        client_id: body.clientId,
        coach_id: effectiveCoachId,
        session_type: normalizedSessionType,
        duration_minutes: durationMinutes,
        client_feedback: body.clientFeedback ?? null,
        notes: body.notes ?? null,
        exercises: body.exercises ?? [],
        metrics,
        published: true,
        published_at: sessionDate,
        created_at: sessionDate,
        updated_at: sessionDate,
        sessions_used: 1,
      });

      return c.json(
        success({
          id,
          clientId: body.clientId,
          coachId: effectiveCoachId,
          sessionType: normalizedSessionType,
          duration: durationMinutes,
          durationMinutes,
          notes: body.notes ?? null,
          exercises: body.exercises ?? [],
          clientFeedback: body.clientFeedback ?? null,
          customSessionType: body.customSessionType ?? null,
          photoUrl: body.photoUrl ?? null,
          date: sessionDate.toISOString(),
        }),
        201,
      );
    } catch (err) {
      return c.json(
        error("SESSION_LOG_CREATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// GET /session-logs — list logs (coach-scoped by default for coaches)
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;

    const clientId = c.req.query("clientId") ?? c.req.query("client_id");
    const coachIdQuery = c.req.query("coachId") ?? c.req.query("coach_id");
    const dateFrom = c.req.query("dateFrom") ?? c.req.query("date_from");
    const dateTo = c.req.query("dateTo") ?? c.req.query("date_to");

    const effectiveCoachId = tenantRole === "coach" ? user.id : coachIdQuery;

    try {
      const conditions = [eq(sessionLogs.tenant_id, tenantId)];

      if (effectiveCoachId) {
        conditions.push(eq(sessionLogs.coach_id, effectiveCoachId));
      }
      if (clientId) {
        conditions.push(eq(sessionLogs.client_id, clientId));
      }
      if (dateFrom) {
        const parsed = new Date(dateFrom);
        if (Number.isNaN(parsed.getTime())) {
          return c.json(error("BAD_REQUEST", "Invalid dateFrom format"), 400);
        }
        conditions.push(gte(sessionLogs.created_at, parsed));
      }
      if (dateTo) {
        const parsed = new Date(dateTo);
        if (Number.isNaN(parsed.getTime())) {
          return c.json(error("BAD_REQUEST", "Invalid dateTo format"), 400);
        }
        parsed.setHours(23, 59, 59, 999);
        conditions.push(lte(sessionLogs.created_at, parsed));
      }

      const rows = await db
        .select({
          id: sessionLogs.id,
          clientId: sessionLogs.client_id,
          coachId: sessionLogs.coach_id,
          sessionType: sessionLogs.session_type,
          durationMinutes: sessionLogs.duration_minutes,
          clientFeedback: sessionLogs.client_feedback,
          notes: sessionLogs.notes,
          metrics: sessionLogs.metrics,
          exercises: sessionLogs.exercises,
          createdAt: sessionLogs.created_at,
          updatedAt: sessionLogs.updated_at,
          clientName: users.name,
          clientAvatar: users.avatar_url,
          coachName: coachUsers.name,
        })
        .from(sessionLogs)
        .innerJoin(users, eq(sessionLogs.client_id, users.id))
        .leftJoin(coachUsers, eq(sessionLogs.coach_id, coachUsers.id))
        .where(and(...conditions))
        .orderBy(desc(sessionLogs.created_at));

      return c.json(
        success(
          rows.map((row) => {
            const duration = row.durationMinutes ?? extractDurationMinutes(row.metrics);
            return {
              id: row.id,
              clientId: row.clientId,
              coachId: row.coachId,
              clientName: row.clientName,
              clientAvatar: row.clientAvatar,
              coachName: row.coachName,
              sessionType: row.sessionType,
              duration,
              durationMinutes: duration,
              clientFeedback:
                row.clientFeedback ??
                extractStringMetric(row.metrics, "clientFeedback"),
              customSessionType: extractStringMetric(row.metrics, "customSessionType"),
              photoUrl: extractStringMetric(row.metrics, "photoUrl"),
              notes: row.notes,
              exercises: (row.exercises as unknown[]) ?? [],
              createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
              updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
            };
          }),
        ),
      );
    } catch (err) {
      return c.json(error("SESSION_LOGS_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /session-logs/:id — detail
app.get(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const id = c.req.param("id");

    try {
      const conditions = [
        eq(sessionLogs.tenant_id, tenantId),
        eq(sessionLogs.id, id),
      ];

      if (tenantRole === "coach") {
        conditions.push(eq(sessionLogs.coach_id, user.id));
      }

      const [row] = await db
        .select({
          id: sessionLogs.id,
          clientId: sessionLogs.client_id,
          coachId: sessionLogs.coach_id,
          sessionType: sessionLogs.session_type,
          durationMinutes: sessionLogs.duration_minutes,
          clientFeedback: sessionLogs.client_feedback,
          notes: sessionLogs.notes,
          metrics: sessionLogs.metrics,
          exercises: sessionLogs.exercises,
          createdAt: sessionLogs.created_at,
          updatedAt: sessionLogs.updated_at,
          clientName: users.name,
          clientAvatar: users.avatar_url,
          coachName: coachUsers.name,
          coachEmail: coachUsers.email,
        })
        .from(sessionLogs)
        .innerJoin(users, eq(sessionLogs.client_id, users.id))
        .leftJoin(coachUsers, eq(sessionLogs.coach_id, coachUsers.id))
        .where(and(...conditions))
        .limit(1);

      if (!row) {
        return c.json(error("NOT_FOUND", "Session log not found"), 404);
      }

      return c.json(
        success((() => {
          const duration = row.durationMinutes ?? extractDurationMinutes(row.metrics);
          return {
            id: row.id,
            clientId: row.clientId,
            coachId: row.coachId,
            clientName: row.clientName,
            clientAvatar: row.clientAvatar,
            coachName: row.coachName,
            coachEmail: row.coachEmail,
            sessionType: row.sessionType,
            duration,
            durationMinutes: duration,
            clientFeedback:
              row.clientFeedback ??
              extractStringMetric(row.metrics, "clientFeedback"),
            customSessionType: extractStringMetric(row.metrics, "customSessionType"),
            photoUrl: extractStringMetric(row.metrics, "photoUrl"),
            notes: row.notes,
            metrics: row.metrics,
            exercises: (row.exercises as unknown[]) ?? [],
            createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
          };
        })()),
      );
    } catch (err) {
      return c.json(error("SESSION_LOG_DETAIL_ERROR", (err as Error).message), 500);
    }
  },
);

export { app as sessionLogsRouter };
