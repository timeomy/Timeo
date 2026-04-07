import { Hono } from "hono";
import { db } from "@timeo/db";
import { checkIns, tenantMemberships, subscriptions, payments, users, tenants } from "@timeo/db/schema";
import { eq, desc, and, gte, sql, count, lt } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /tenants/:tenantId/mission-control
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    try {
      // --- Metrics ---
      // Total active members (customers only)
      const [totalMembersRow] = await db
        .select({ count: count() })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.role, "customer"),
            eq(tenantMemberships.status, "active"),
          ),
        );

      // Today's check-ins
      const [todayCheckInsRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, todayStart),
          ),
        );

      // This week's check-ins
      const [weekCheckInsRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, weekAgo),
          ),
        );

      // Active subscriptions
      const [activeSubsRow] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.status, "active"),
          ),
        );

      // Monthly revenue (succeeded payments this month)
      const [monthRevenueRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.tenant_id, tenantId),
            eq(payments.status, "succeeded"),
            gte(payments.created_at, monthStart),
          ),
        );

      // Staff count (admin + staff roles)
      const [staffCountRow] = await db
        .select({ count: count() })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.status, "active"),
            sql`${tenantMemberships.role} IN ('staff', 'admin')`,
          ),
        );

      // New members this month
      const [newThisMonthRow] = await db
        .select({ count: count() })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.role, "customer"),
            gte(tenantMemberships.joined_at, monthStart),
          ),
        );

      // New members last month
      const [newLastMonthRow] = await db
        .select({ count: count() })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.role, "customer"),
            gte(tenantMemberships.joined_at, lastMonthStart),
            lt(tenantMemberships.joined_at, monthStart),
          ),
        );

      // --- Membership breakdown ---
      const membershipBreakdownRows = await db
        .select({
          status: tenantMemberships.status,
          count: count(),
        })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.role, "customer"),
          ),
        )
        .groupBy(tenantMemberships.status);

      const membershipBreakdown: Record<string, number> = {
        active: 0,
        suspended: 0,
        invited: 0,
        inactive: 0,
      };
      for (const row of membershipBreakdownRows) {
        membershipBreakdown[row.status] = Number(row.count);
      }

      // --- Recent check-ins (last 20) ---
      const recentCheckInRows = await db
        .select({
          id: checkIns.id,
          userId: checkIns.user_id,
          method: checkIns.method,
          timestamp: checkIns.timestamp,
          userName: users.name,
          userEmail: users.email,
        })
        .from(checkIns)
        .leftJoin(users, eq(checkIns.user_id, users.id))
        .where(eq(checkIns.tenant_id, tenantId))
        .orderBy(desc(checkIns.timestamp))
        .limit(20);

      const recentCheckIns = recentCheckInRows.map((row) => ({
        id: row.id,
        userId: row.userId,
        method: row.method,
        timestamp: row.timestamp?.toISOString() ?? new Date().toISOString(),
        userName: row.userName ?? row.userEmail ?? "Unknown",
        userEmail: row.userEmail ?? "",
        initials: getInitials(row.userName ?? row.userEmail ?? "?"),
      }));

      // --- Heatmap: check-ins by day-of-week × hour ---
      const heatmapRows = await db
        .select({
          day: sql<number>`EXTRACT(DOW FROM ${checkIns.timestamp})::int`,
          hour: sql<number>`EXTRACT(HOUR FROM ${checkIns.timestamp})::int`,
          count: count(),
        })
        .from(checkIns)
        .where(eq(checkIns.tenant_id, tenantId))
        .groupBy(
          sql`EXTRACT(DOW FROM ${checkIns.timestamp})`,
          sql`EXTRACT(HOUR FROM ${checkIns.timestamp})`,
        );

      const heatmap = heatmapRows.map((row) => ({
        day: Number(row.day),
        hour: Number(row.hour),
        count: Number(row.count),
      }));

      return c.json(
        success({
          metrics: {
            totalMembers: Number(totalMembersRow?.count ?? 0),
            todayCheckIns: Number(todayCheckInsRow?.count ?? 0),
            weekCheckIns: Number(weekCheckInsRow?.count ?? 0),
            activeSubscriptions: Number(activeSubsRow?.count ?? 0),
            monthRevenue: Number(monthRevenueRow?.total ?? 0),
            staffCount: Number(staffCountRow?.count ?? 0),
            newMembersThisMonth: Number(newThisMonthRow?.count ?? 0),
            newMembersLastMonth: Number(newLastMonthRow?.count ?? 0),
          },
          recentCheckIns,
          heatmap,
          membershipBreakdown,
        }),
      );
    } catch (err) {
      return c.json(error("MISSION_CONTROL_ERROR", (err as Error).message), 500);
    }
  },
);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export { app as missionControlRouter };
