import { db } from "@timeo/db";
import { bookings, bookingEvents } from "@timeo/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { generateId } from "@timeo/db";

/**
 * Finds confirmed bookings that are 1h past their end_time
 * and marks them as no_show.
 */
export async function runAutoCancelNoShows() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const overdue = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), lt(bookings.end_time, cutoff)));

  for (const booking of overdue) {
    await db
      .update(bookings)
      .set({ status: "no_show", updated_at: new Date() })
      .where(eq(bookings.id, booking.id));

    await db.insert(bookingEvents).values({
      id: generateId(),
      tenant_id: booking.tenant_id,
      booking_id: booking.id,
      type: "no_show",
      actor_id: booking.customer_id,
      metadata: { autoMarked: true },
    });
  }

  return { processed: overdue.length };
}
