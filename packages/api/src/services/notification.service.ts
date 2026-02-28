import { db } from "@timeo/db";
import { notifications } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { emitToUser } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";

type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "order_update"
  | "staff_invitation"
  | "payment_received"
  | "check_in"
  | "session_logged"
  | "credits_low"
  | "voucher_received"
  | "receipt"
  | "system";

export async function createNotification(input: {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: unknown;
}) {
  const notifId = generateId();

  await db.insert(notifications).values({
    id: notifId,
    user_id: input.userId,
    tenant_id: input.tenantId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
  });

  emitToUser(input.userId, SocketEvents.NOTIFICATION_NEW, {
    id: notifId,
    type: input.type,
    title: input.title,
    body: input.body,
  });

  return notifId;
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  for (const id of ids) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));
  }
}

export async function markAllNotificationsRead(
  userId: string,
  tenantId: string,
) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.user_id, userId),
        eq(notifications.tenant_id, tenantId),
        eq(notifications.read, false),
      ),
    );
}
