import { db } from "@timeo/db";
import { checkIns, auditLogs } from "@timeo/db/schema";
import { generateId } from "@timeo/db";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";

export async function createCheckIn(input: {
  tenantId: string;
  userId: string;
  method: "qr" | "nfc" | "manual";
  checkedInBy?: string;
}) {
  const checkInId = generateId();

  await db.insert(checkIns).values({
    id: checkInId,
    tenant_id: input.tenantId,
    user_id: input.userId,
    method: input.method,
    checked_in_by: input.checkedInBy ?? null,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.checkedInBy ?? input.userId,
    actor_role: "staff",
    action: "check_in.created",
    resource_type: "check_in",
    resource_id: checkInId,
    details: { method: input.method },
  });

  emitToTenant(input.tenantId, SocketEvents.CHECKIN_CREATED, {
    checkInId,
    userId: input.userId,
    tenantId: input.tenantId,
  });

  return checkInId;
}
