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
  tenantMemberships,
  loyaltyPoints,
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

  // Transform into the shape the client expects
  const bookingsByStatus: Record<string, number> = {};
  let totalBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;
  let noShowBookings = 0;

  for (const row of statusCounts) {
    const cnt = Number(row.count);
    bookingsByStatus[row.status] = cnt;
    totalBookings += cnt;
    if (row.status === "completed") completedBookings = cnt;
    if (row.status === "cancelled") cancelledBookings = cnt;
    if (row.status === "no_show") noShowBookings = cnt;
  }

  const completionRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

  return {
    totalBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    completionRate,
    byDay: [],
    bookingsByStatus,
  };
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

  // Transform into the shape the client expects
  const ordersByStatus: Record<string, number> = {};
  let totalOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;

  for (const row of statusCounts) {
    const cnt = Number(row.count);
    ordersByStatus[row.status] = cnt;
    totalOrders += cnt;
    totalRevenue += Number(row.totalRevenue ?? 0);
    if (row.status === "completed") completedOrders = cnt;
    if (row.status === "cancelled") cancelledOrders = cnt;
  }

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    currency: "MYR",
    byDay: [],
    ordersByStatus,
  };
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

// ─── Time-Series Analytics ──────────────────────────────────────────────────

export async function getRevenueTrend(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const onlineRows = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${payments.created_at})::date`.as("date"),
      revenue: sum(payments.amount),
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenant_id, tenantId),
        eq(payments.status, "succeeded"),
        gte(payments.created_at, from),
        lte(payments.created_at, to),
      ),
    )
    .groupBy(sql`DATE_TRUNC('day', ${payments.created_at})::date`)
    .orderBy(sql`DATE_TRUNC('day', ${payments.created_at})::date`);

  const posRows = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${posTransactions.created_at})::date`.as("date"),
      revenue: sum(posTransactions.total),
    })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.tenant_id, tenantId),
        eq(posTransactions.status, "completed"),
        gte(posTransactions.created_at, from),
        lte(posTransactions.created_at, to),
      ),
    )
    .groupBy(sql`DATE_TRUNC('day', ${posTransactions.created_at})::date`)
    .orderBy(sql`DATE_TRUNC('day', ${posTransactions.created_at})::date`);

  // Merge online + POS revenue by date
  const byDate = new Map<string, number>();
  for (const row of onlineRows) {
    const d = String(row.date);
    byDate.set(d, (byDate.get(d) ?? 0) + Number(row.revenue ?? 0));
  }
  for (const row of posRows) {
    const d = String(row.date);
    byDate.set(d, (byDate.get(d) ?? 0) + Number(row.revenue ?? 0));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

export async function getBookingTrend(
  tenantId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${bookings.created_at})::date`.as("date"),
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
    .groupBy(sql`DATE_TRUNC('day', ${bookings.created_at})::date`)
    .orderBy(sql`DATE_TRUNC('day', ${bookings.created_at})::date`);

  return rows.map((r) => ({ date: String(r.date), count: Number(r.count) }));
}

// ─── Customer Analytics ─────────────────────────────────────────────────────

export async function getCustomerAnalytics(tenantId: string) {
  // Total customers (members with role "customer")
  const [totalRow] = await db
    .select({ total: count() })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.role, "customer"),
        eq(tenantMemberships.status, "active"),
      ),
    );

  // New this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [newRow] = await db
    .select({ count: count() })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.role, "customer"),
        gte(tenantMemberships.joined_at, monthStart),
      ),
    );

  // Returning customers (booking count > 1)
  const returningRows = await db
    .select({ count: sql<number>`count(DISTINCT ${bookings.customer_id})` })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenant_id, tenantId),
      ),
    )
    .having(sql`count(${bookings.id}) > 1`)
    .groupBy(bookings.customer_id);

  // Top spenders — join loyalty_points with users
  const topSpenders = await db
    .select({
      userId: loyaltyPoints.user_id,
      name: users.name,
      totalSpend: loyaltyPoints.lifetime_earned,
    })
    .from(loyaltyPoints)
    .innerJoin(users, eq(loyaltyPoints.user_id, users.id))
    .where(eq(loyaltyPoints.tenant_id, tenantId))
    .orderBy(desc(loyaltyPoints.lifetime_earned))
    .limit(10);

  // Enrich top spenders with booking count
  const spendersWithBookings = await Promise.all(
    topSpenders.map(async (s) => {
      const [bc] = await db
        .select({ bookingCount: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.tenant_id, tenantId),
            eq(bookings.customer_id, s.userId),
          ),
        );
      return {
        userId: s.userId,
        name: s.name,
        totalSpend: s.totalSpend,
        bookingCount: Number(bc?.bookingCount ?? 0),
      };
    }),
  );

  return {
    total: Number(totalRow?.total ?? 0),
    newThisMonth: Number(newRow?.count ?? 0),
    returning: returningRows.length,
    topSpenders: spendersWithBookings,
  };
}
