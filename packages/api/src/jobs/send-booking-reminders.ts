import { db } from "@timeo/db";
import { bookings, services, users, tenants } from "@timeo/db/schema";
import { and, eq, gt, lt } from "drizzle-orm";
import { sendMail } from "@timeo/auth/email";
import { bookingReminderEmail } from "../lib/email-templates.js";

/**
 * Sends reminder emails for bookings starting in the next 24 hours.
 * Intended to run periodically (e.g., every hour).
 */
export async function runSendBookingReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await db
    .select({
      booking: bookings,
      customer: { name: users.name, email: users.email },
      service: { name: services.name },
      tenant: { name: tenants.name },
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.customer_id, users.id))
    .leftJoin(services, eq(bookings.service_id, services.id))
    .leftJoin(tenants, eq(bookings.tenant_id, tenants.id))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        gt(bookings.start_time, now),
        lt(bookings.start_time, in24h),
      ),
    );

  let sent = 0;
  for (const row of upcoming) {
    if (!row.customer?.email || !row.service?.name || !row.tenant?.name)
      continue;

    const template = bookingReminderEmail({
      customerName: row.customer.name,
      serviceName: row.service.name,
      startTime: row.booking.start_time.toISOString(),
      tenantName: row.tenant.name,
    });

    await sendMail({
      to: row.customer.email,
      subject: template.subject,
      html: template.html,
    });
    sent++;
  }

  return { sent };
}
