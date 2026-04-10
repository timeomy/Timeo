import { db } from "@timeo/db";
import { sessionLogs, sessionCredits, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import type { SessionLogFeedback, SessionLogType } from "@timeo/shared";

function extractDurationMinutes(metrics: unknown): number | undefined {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const value = (metrics as Record<string, unknown>).durationMinutes;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.round(value));
}

export async function createSessionLog(input: {
  tenantId: string;
  clientId: string;
  coachId: string;
  bookingId?: string;
  creditId?: string;
  sessionType: SessionLogType;
  durationMinutes?: number;
  clientFeedback?: SessionLogFeedback;
  customSessionType?: string;
  photoUrl?: string;
  notes?: string;
  exercises?: unknown[];
  metrics?: unknown;
}) {
  const logId = generateId();
  const normalizedMetrics =
    input.metrics && typeof input.metrics === "object" && !Array.isArray(input.metrics)
      ? { ...(input.metrics as Record<string, unknown>) }
      : {};

  const durationMinutes =
    input.durationMinutes ?? extractDurationMinutes(normalizedMetrics);
  const clientFeedback =
    input.clientFeedback ??
    (typeof normalizedMetrics.clientFeedback === "string"
      ? (normalizedMetrics.clientFeedback as SessionLogFeedback)
      : undefined);

  if (durationMinutes) {
    normalizedMetrics.durationMinutes = durationMinutes;
  }
  if (clientFeedback) {
    normalizedMetrics.clientFeedback = clientFeedback;
  }
  if (input.customSessionType?.trim()) {
    normalizedMetrics.customSessionType = input.customSessionType.trim();
  }
  if (input.photoUrl?.trim()) {
    normalizedMetrics.photoUrl = input.photoUrl.trim();
  }

  // If a credit is being used, decrement it
  if (input.creditId) {
    const [credit] = await db
      .select()
      .from(sessionCredits)
      .where(
        and(
          eq(sessionCredits.id, input.creditId),
          eq(sessionCredits.tenant_id, input.tenantId),
        ),
      )
      .limit(1);

    if (!credit) throw new Error("Session credit not found");
    if (credit.used_sessions >= credit.total_sessions) {
      throw new Error("No remaining session credits");
    }

    await db
      .update(sessionCredits)
      .set({ used_sessions: credit.used_sessions + 1 })
      .where(eq(sessionCredits.id, input.creditId));
  }

  await db.insert(sessionLogs).values({
    id: logId,
    tenant_id: input.tenantId,
    client_id: input.clientId,
    coach_id: input.coachId,
    booking_id: input.bookingId ?? null,
    credit_id: input.creditId ?? null,
    session_type: input.sessionType,
    duration_minutes: durationMinutes ?? null,
    client_feedback: clientFeedback ?? null,
    notes: input.notes ?? null,
    exercises: input.exercises ?? [],
    metrics:
      Object.keys(normalizedMetrics).length > 0 ? normalizedMetrics : null,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.coachId,
    actor_role: "staff",
    action: "session.logged",
    resource_type: "session_log",
    resource_id: logId,
  });

  return logId;
}
