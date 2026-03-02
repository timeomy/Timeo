import { Hono } from "hono";
import { db } from "@timeo/db";
import {
  tenants,
  users,
  tenantMemberships,
  payments,
  orders,
} from "@timeo/db/schema";
import { sql, gte, and, eq, count } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";

const app = new Hono();

// GET /analytics/overview — total tenants, active users 24h, today's revenue, orders today
app.get("/overview", authMiddleware, requirePlatformAdmin, async (c) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    [tenantCount],
    [userCount],
    [activeMembers],
    [revenueResult],
    [ordersResult],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(tenants),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(DISTINCT user_id)::int` })
      .from(tenantMemberships)
      .where(gte(tenantMemberships.joined_at, twentyFourHoursAgo)),
    db
      .select({
        total: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "succeeded"),
          gte(payments.created_at, todayStart),
        ),
      ),
    db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.created_at, todayStart)),
  ]);

  return c.json(
    success({
      total_tenants: tenantCount?.count ?? 0,
      total_users: userCount?.count ?? 0,
      active_members_24h: activeMembers?.count ?? 0,
      today_revenue: revenueResult?.total ?? 0,
      orders_today: ordersResult?.count ?? 0,
      today_start: todayStart.toISOString(),
    }),
  );
});

// GET /analytics/tenants — tenant growth over time
app.get("/tenants", authMiddleware, requirePlatformAdmin, async (c) => {
  const days = parseInt(c.req.query("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${tenants.created_at})::date`.as(
        "date",
      ),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(tenants)
    .where(gte(tenants.created_at, since))
    .groupBy(sql`date_trunc('day', ${tenants.created_at})`)
    .orderBy(sql`date_trunc('day', ${tenants.created_at})`);

  return c.json(success(rows));
});

export { app as analyticsRouter };
