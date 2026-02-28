import { db } from "@timeo/db";
import { sessionLogs, sessionCredits, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

export async function createSessionLog(input: {
  tenantId: string;
  clientId: string;
  coachId: string;
  bookingId?: string;
  creditId?: string;
  sessionType: "personal_training" | "group_class" | "assessment" | "consultation";
  notes?: string;
  exercises?: unknown[];
  metrics?: unknown;
}) {
  const logId = generateId();

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
    notes: input.notes ?? null,
    exercises: input.exercises ?? [],
    metrics: input.metrics ?? null,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.coachId,
    action: "session.logged",
    resource: "session_logs",
    resource_id: logId,
  });

  return logId;
}
