import { db } from "@timeo/db";
import {
  bookings,
  orders,
  orderItems,
  posTransactions,
  products,
  services,
  payments,
  users,
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

export async function getOrderAnalytics(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const statusCounts = await db
    .select({
      status: orders.status,
      count: count(),
      totalRevenue: sum(orders.total_amount),
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenant_id, tenantId),
        gte(orders.created_at, from),
        lte(orders.created_at, to),
      ),
    )
    .groupBy(orders.status);

  const totalRevenue = statusCounts.reduce(
    (acc, row) => acc + Number(row.totalRevenue ?? 0),
    0,
  );

  return { statusCounts, totalRevenue };
}

export async function getTopProducts(
  tenantId: string,
  from: Date,
  to: Date,
  limit = 10,
) {
  const topProducts = await db
    .select({
      productId: orderItems.product_id,
      productName: products.name,
      totalQuantity: sum(orderItems.quantity),
      revenue: sum(sql`${orderItems.snapshot_price} * ${orderItems.quantity}`),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.order_id, orders.id))
    .leftJoin(products, eq(orderItems.product_id, products.id))
    .where(
      and(
        eq(orders.tenant_id, tenantId),
        gte(orders.created_at, from),
        lte(orders.created_at, to),
      ),
    )
    .groupBy(orderItems.product_id, products.name)
    .orderBy(desc(sum(orderItems.quantity)))
    .limit(limit);

  return topProducts;
}

export async function getStaffPerformance(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const staffStats = await db
    .select({
      staffId: bookings.staff_id,
      staffName: users.name,
      bookingCount: count(),
      totalRevenue: sum(services.price),
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.service_id, services.id))
    .leftJoin(users, eq(bookings.staff_id, users.id))
    .where(
      and(
        eq(bookings.tenant_id, tenantId),
        gte(bookings.created_at, from),
        lte(bookings.created_at, to),
      ),
    )
    .groupBy(bookings.staff_id, users.name)
    .orderBy(desc(count()));

  return staffStats;
}
