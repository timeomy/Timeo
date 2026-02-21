import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireRole, requirePlatformAdmin } from "./lib/middleware";
import {
  type AnalyticsPeriod,
  getPeriodRange,
  getPreviousPeriodRange,
  groupByDay,
  groupByHour,
  calculatePercentChange,
  fillDailyGaps,
} from "./lib/analyticsHelpers";

const periodValidator = v.union(
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
  v.literal("year")
);

// ─── Tenant-Level Analytics ───────────────────────────────────────────────────

export const getRevenueOverview = query({
  args: { tenantId: v.id("tenants"), period: periodValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);
    const prevRange = getPreviousPeriodRange(args.period as AnalyticsPeriod);

    // Fetch bookings in current period
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const periodBookings = bookings.filter(
      (b) =>
        b.status === "completed" &&
        b.createdAt >= range.start &&
        b.createdAt <= range.end
    );
    const prevBookings = bookings.filter(
      (b) =>
        b.status === "completed" &&
        b.createdAt >= prevRange.start &&
        b.createdAt < prevRange.end
    );

    // Fetch orders in current period
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const periodOrders = orders.filter(
      (o) =>
        o.status === "completed" &&
        o.createdAt >= range.start &&
        o.createdAt <= range.end
    );
    const prevOrders = orders.filter(
      (o) =>
        o.status === "completed" &&
        o.createdAt >= prevRange.start &&
        o.createdAt < prevRange.end
    );

    // Calculate booking revenue from service prices
    const services = await ctx.db
      .query("services")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const serviceMap = new Map(services.map((s) => [s._id, s]));

    let bookingRevenue = 0;
    for (const b of periodBookings) {
      const svc = serviceMap.get(b.serviceId);
      if (svc) bookingRevenue += svc.price;
    }

    let prevBookingRevenue = 0;
    for (const b of prevBookings) {
      const svc = serviceMap.get(b.serviceId);
      if (svc) prevBookingRevenue += svc.price;
    }

    const orderRevenue = periodOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );
    const prevOrderRevenue = prevOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );

    const totalRevenue = bookingRevenue + orderRevenue;
    const prevTotalRevenue = prevBookingRevenue + prevOrderRevenue;
    const percentChange = calculatePercentChange(totalRevenue, prevTotalRevenue);

    // Revenue by day (combine bookings + orders)
    const bookingsByDay = groupByDay(
      periodBookings,
      (b) => b.createdAt,
      (b) => serviceMap.get(b.serviceId)?.price ?? 0
    );
    const ordersByDay = groupByDay(
      periodOrders,
      (o) => o.createdAt,
      (o) => o.totalAmount
    );

    // Merge the two daily datasets
    const dayMap = new Map<string, { date: string; count: number; total: number }>();
    for (const d of bookingsByDay) {
      dayMap.set(d.date, { ...d });
    }
    for (const d of ordersByDay) {
      const existing = dayMap.get(d.date);
      if (existing) {
        existing.count += d.count;
        existing.total += d.total;
      } else {
        dayMap.set(d.date, { ...d });
      }
    }

    const revenueByDay = fillDailyGaps(
      Array.from(dayMap.values()),
      range.start,
      range.end
    );

    return {
      totalRevenue,
      bookingRevenue,
      orderRevenue,
      percentChange,
      revenueByDay: revenueByDay.map((d) => ({
        date: d.date,
        amount: d.total,
      })),
    };
  },
});

export const getBookingAnalytics = query({
  args: { tenantId: v.id("tenants"), period: periodValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);

    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const periodBookings = allBookings.filter(
      (b) => b.createdAt >= range.start && b.createdAt <= range.end
    );

    const totalBookings = periodBookings.length;
    const completedBookings = periodBookings.filter(
      (b) => b.status === "completed"
    ).length;
    const cancelledBookings = periodBookings.filter(
      (b) => b.status === "cancelled"
    ).length;
    const noShows = periodBookings.filter(
      (b) => b.status === "no_show"
    ).length;
    const pendingBookings = periodBookings.filter(
      (b) => b.status === "pending"
    ).length;
    const confirmedBookings = periodBookings.filter(
      (b) => b.status === "confirmed"
    ).length;

    const completionRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 100)
        : 0;

    const daysInPeriod = Math.max(
      1,
      Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24))
    );
    const averageBookingsPerDay = Math.round(
      (totalBookings / daysInPeriod) * 10
    ) / 10;

    const bookingsByStatus = {
      pending: pendingBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      no_show: noShows,
    };

    const bookingsByDay = fillDailyGaps(
      groupByDay(periodBookings, (b) => b.createdAt),
      range.start,
      range.end
    );

    const peakHours = groupByHour(periodBookings, (b) => b.startTime);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      noShows,
      completionRate,
      averageBookingsPerDay,
      bookingsByStatus,
      bookingsByDay: bookingsByDay.map((d) => ({
        date: d.date,
        count: d.count,
      })),
      peakHours,
    };
  },
});

export const getOrderAnalytics = query({
  args: { tenantId: v.id("tenants"), period: periodValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);

    const allOrders = await ctx.db
      .query("orders")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const periodOrders = allOrders.filter(
      (o) => o.createdAt >= range.start && o.createdAt <= range.end
    );

    const totalOrders = periodOrders.length;
    const completedOrders = periodOrders.filter(
      (o) => o.status === "completed"
    );
    const cancelledOrders = periodOrders.filter(
      (o) => o.status === "cancelled"
    ).length;
    const pendingOrders = periodOrders.filter(
      (o) => o.status === "pending" || o.status === "awaiting_payment"
    ).length;

    const averageOrderValue =
      completedOrders.length > 0
        ? Math.round(
            completedOrders.reduce((sum, o) => sum + o.totalAmount, 0) /
              completedOrders.length
          )
        : 0;

    const ordersByStatus = {
      pending: pendingOrders,
      confirmed: periodOrders.filter((o) => o.status === "confirmed").length,
      preparing: periodOrders.filter((o) => o.status === "preparing").length,
      ready: periodOrders.filter((o) => o.status === "ready").length,
      completed: completedOrders.length,
      cancelled: cancelledOrders,
    };

    const ordersByDay = fillDailyGaps(
      groupByDay(
        periodOrders,
        (o) => o.createdAt,
        (o) => o.totalAmount
      ),
      range.start,
      range.end
    );

    return {
      totalOrders,
      completedOrders: completedOrders.length,
      averageOrderValue,
      ordersByStatus,
      ordersByDay: ordersByDay.map((d) => ({
        date: d.date,
        count: d.count,
        revenue: d.total,
      })),
    };
  },
});

export const getTopServices = query({
  args: {
    tenantId: v.id("tenants"),
    period: periodValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);
    const maxResults = args.limit ?? 10;

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const periodBookings = bookings.filter(
      (b) => b.createdAt >= range.start && b.createdAt <= range.end
    );

    const services = await ctx.db
      .query("services")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const serviceMap = new Map(services.map((s) => [s._id, s]));

    // Aggregate by service
    const serviceStats = new Map<
      string,
      { bookingCount: number; revenue: number }
    >();
    for (const b of periodBookings) {
      const existing = serviceStats.get(b.serviceId) ?? {
        bookingCount: 0,
        revenue: 0,
      };
      existing.bookingCount++;
      const svc = serviceMap.get(b.serviceId);
      if (svc) existing.revenue += svc.price;
      serviceStats.set(b.serviceId, existing);
    }

    const totalRevenue = Array.from(serviceStats.values()).reduce(
      (sum, s) => sum + s.revenue,
      0
    );

    return Array.from(serviceStats.entries())
      .map(([serviceId, stats]) => ({
        serviceId,
        serviceName: serviceMap.get(serviceId as Id<"services">)?.name ?? "Unknown",
        bookingCount: stats.bookingCount,
        revenue: stats.revenue,
        percentOfTotal:
          totalRevenue > 0
            ? Math.round((stats.revenue / totalRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, maxResults);
  },
});

export const getTopProducts = query({
  args: {
    tenantId: v.id("tenants"),
    period: periodValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);
    const maxResults = args.limit ?? 10;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const periodOrders = orders.filter(
      (o) =>
        o.status === "completed" &&
        o.createdAt >= range.start &&
        o.createdAt <= range.end
    );

    // Gather all order items for period orders
    const productStats = new Map<
      string,
      { unitsSold: number; revenue: number; name: string }
    >();
    for (const order of periodOrders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        const existing = productStats.get(item.productId) ?? {
          unitsSold: 0,
          revenue: 0,
          name: item.snapshotName,
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.snapshotPrice * item.quantity;
        productStats.set(item.productId, existing);
      }
    }

    const totalRevenue = Array.from(productStats.values()).reduce(
      (sum, p) => sum + p.revenue,
      0
    );

    return Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        productName: stats.name,
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
        percentOfTotal:
          totalRevenue > 0
            ? Math.round((stats.revenue / totalRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, maxResults);
  },
});

export const getCustomerAnalytics = query({
  args: { tenantId: v.id("tenants"), period: periodValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);

    // All customer memberships
    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_role", (q) =>
        q.eq("tenantId", args.tenantId).eq("role", "customer")
      )
      .collect();
    const activeMemberships = memberships.filter(
      (m) => m.status === "active"
    );
    const totalCustomers = activeMemberships.length;
    const newCustomers = activeMemberships.filter(
      (m) => m.joinedAt >= range.start && m.joinedAt <= range.end
    ).length;
    const returningCustomers = totalCustomers - newCustomers;

    // Top customers by spend
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const completedBookings = bookings.filter(
      (b) => b.status === "completed"
    );

    const services = await ctx.db
      .query("services")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const serviceMap = new Map(services.map((s) => [s._id, s]));

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const completedOrders = orders.filter((o) => o.status === "completed");

    // Aggregate customer spending
    const customerSpend = new Map<
      string,
      { totalSpent: number; bookingCount: number }
    >();

    for (const b of completedBookings) {
      const existing = customerSpend.get(b.customerId) ?? {
        totalSpent: 0,
        bookingCount: 0,
      };
      existing.bookingCount++;
      const svc = serviceMap.get(b.serviceId);
      if (svc) existing.totalSpent += svc.price;
      customerSpend.set(b.customerId, existing);
    }

    for (const o of completedOrders) {
      const existing = customerSpend.get(o.customerId) ?? {
        totalSpent: 0,
        bookingCount: 0,
      };
      existing.totalSpent += o.totalAmount;
      customerSpend.set(o.customerId, existing);
    }

    // Get top 10 customers
    const topCustomerEntries = Array.from(customerSpend.entries())
      .sort(([, a], [, b]) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const topCustomers = await Promise.all(
      topCustomerEntries.map(async ([customerId, stats]) => {
        const user = await ctx.db.get(customerId as Id<"users">);
        return {
          customerId,
          name: user?.name ?? "Unknown",
          totalSpent: stats.totalSpent,
          bookingCount: stats.bookingCount,
        };
      })
    );

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      topCustomers,
    };
  },
});

export const getStaffPerformance = query({
  args: { tenantId: v.id("tenants"), period: periodValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    const range = getPeriodRange(args.period as AnalyticsPeriod);

    // Get staff members
    const staffMemberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_role", (q) =>
        q.eq("tenantId", args.tenantId).eq("role", "staff")
      )
      .collect();
    const activeStaff = staffMemberships.filter(
      (m) => m.status === "active"
    );

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const periodBookings = bookings.filter(
      (b) => b.createdAt >= range.start && b.createdAt <= range.end
    );

    const services = await ctx.db
      .query("services")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const serviceMap = new Map(services.map((s) => [s._id, s]));

    const result = await Promise.all(
      activeStaff.map(async (staff) => {
        const user = await ctx.db.get(staff.userId);
        const staffBookings = periodBookings.filter(
          (b) => b.staffId === staff.userId
        );
        const completed = staffBookings.filter(
          (b) => b.status === "completed"
        ).length;
        const total = staffBookings.length;
        const completionRate =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        let revenue = 0;
        for (const b of staffBookings.filter(
          (b) => b.status === "completed"
        )) {
          const svc = serviceMap.get(b.serviceId);
          if (svc) revenue += svc.price;
        }

        return {
          staffId: staff.userId,
          staffName: user?.name ?? "Unknown",
          bookingsHandled: total,
          completionRate,
          revenue,
        };
      })
    );

    return result.sort((a, b) => b.revenue - a.revenue);
  },
});

// ─── Platform-Level Analytics ─────────────────────────────────────────────────

export const getPlatformOverview = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();
    const bookings = await ctx.db.query("bookings").collect();
    const orders = await ctx.db.query("orders").collect();

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(
      (t) => t.status === "active"
    ).length;
    const totalUsers = users.length;
    const totalBookings = bookings.length;
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Plan distribution
    const tenantsByPlan: Record<string, number> = {};
    for (const t of tenants) {
      tenantsByPlan[t.plan] = (tenantsByPlan[t.plan] ?? 0) + 1;
    }

    // Growth: compare this month vs last month
    const now = new Date();
    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ).getTime();

    const newTenantsThisMonth = tenants.filter(
      (t) => t.createdAt >= thisMonthStart
    ).length;
    const newTenantsLastMonth = tenants.filter(
      (t) => t.createdAt >= lastMonthStart && t.createdAt < thisMonthStart
    ).length;
    const newUsersThisMonth = users.filter(
      (u) => u.createdAt >= thisMonthStart
    ).length;
    const newUsersLastMonth = users.filter(
      (u) => u.createdAt >= lastMonthStart && u.createdAt < thisMonthStart
    ).length;

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalBookings,
      totalOrders,
      totalRevenue,
      tenantsByPlan,
      growthMetrics: {
        newTenantsThisMonth,
        newTenantsLastMonth,
        tenantGrowthPercent: calculatePercentChange(
          newTenantsThisMonth,
          newTenantsLastMonth
        ),
        newUsersThisMonth,
        newUsersLastMonth,
        userGrowthPercent: calculatePercentChange(
          newUsersThisMonth,
          newUsersLastMonth
        ),
      },
    };
  },
});

export const getTenantRankings = query({
  args: {
    metric: v.union(
      v.literal("revenue"),
      v.literal("bookings"),
      v.literal("users")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const maxResults = args.limit ?? 10;
    const tenants = await ctx.db.query("tenants").collect();

    if (args.metric === "revenue") {
      const orders = await ctx.db.query("orders").collect();
      const completedOrders = orders.filter(
        (o) => o.status === "completed"
      );
      const revenueByTenant = new Map<string, number>();
      for (const o of completedOrders) {
        revenueByTenant.set(
          o.tenantId,
          (revenueByTenant.get(o.tenantId) ?? 0) + o.totalAmount
        );
      }
      return tenants
        .map((t) => ({
          tenantId: t._id,
          tenantName: t.name,
          value: revenueByTenant.get(t._id) ?? 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxResults);
    }

    if (args.metric === "bookings") {
      const bookings = await ctx.db.query("bookings").collect();
      const bookingsByTenant = new Map<string, number>();
      for (const b of bookings) {
        bookingsByTenant.set(
          b.tenantId,
          (bookingsByTenant.get(b.tenantId) ?? 0) + 1
        );
      }
      return tenants
        .map((t) => ({
          tenantId: t._id,
          tenantName: t.name,
          value: bookingsByTenant.get(t._id) ?? 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxResults);
    }

    // users
    const memberships = await ctx.db
      .query("tenantMemberships")
      .collect();
    const usersByTenant = new Map<string, number>();
    for (const m of memberships) {
      if (m.status === "active") {
        usersByTenant.set(
          m.tenantId,
          (usersByTenant.get(m.tenantId) ?? 0) + 1
        );
      }
    }
    return tenants
      .map((t) => ({
        tenantId: t._id,
        tenantName: t.name,
        value: usersByTenant.get(t._id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxResults);
  },
});
