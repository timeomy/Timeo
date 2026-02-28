import { db } from "@timeo/db";
import {
  bookings,
  orders,
  posTransactions,
  services,
  payments,
} from "@timeo/db/schema";
import { and, eq, gte, lte, sql, count, sum, desc } from "drizzle-orm";

export async function getRevenueOverview(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const [paymentStats] = await db
    .select({
      totalRevenue: sum(payments.amount),
      totalPayments: count(),
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenant_id, tenantId),
        eq(payments.status, "succeeded"),
        gte(payments.created_at, from),
        lte(payments.created_at, to),
      ),
    );

  const [posStats] = await db
    .select({
      totalRevenue: sum(posTransactions.total),
      totalTransactions: count(),
    })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.tenant_id, tenantId),
        eq(posTransactions.status, "completed"),
        gte(posTransactions.created_at, from),
        lte(posTransactions.created_at, to),
      ),
    );

  return {
    onlineRevenue: Number(paymentStats?.totalRevenue ?? 0),
    onlinePayments: Number(paymentStats?.totalPayments ?? 0),
    posRevenue: Number(posStats?.totalRevenue ?? 0),
    posTransactions: Number(posStats?.totalTransactions ?? 0),
    totalRevenue:
      Number(paymentStats?.totalRevenue ?? 0) +
      Number(posStats?.totalRevenue ?? 0),
  };
}

export async function getBookingAnalytics(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const statusCounts = await db
    .select({
      status: bookings.status,
      count: count(),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenant_id, tenantId),
        gte(bookings.created_at, from),
        lte(bookings.created_at, to),
      ),
    )
    .groupBy(bookings.status);

  return statusCounts;
}

export async function getTopServices(
  tenantId: string,
  from: Date,
  to: Date,
  limit = 10,
) {
  const topServices = await db
    .select({
      serviceId: bookings.service_id,
      serviceName: services.name,
      bookingCount: count(),
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.service_id, services.id))
    .where(
      and(
        eq(bookings.tenant_id, tenantId),
        gte(bookings.created_at, from),
        lte(bookings.created_at, to),
      ),
    )
    .groupBy(bookings.service_id, services.name)
    .orderBy(desc(count()))
    .limit(limit);

  return topServices;
}
