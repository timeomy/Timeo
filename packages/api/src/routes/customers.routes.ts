import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import {
  tenantMemberships,
  users,
  bookings,
  payments,
  posTransactions,
} from "@timeo/db/schema";
import { and, eq, desc, count, sum, max } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { UpdateCustomerSchema } from "../lib/validation.js";

const app = new Hono();

// GET /tenants/:tenantId/customers
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");

    // Get customer members with user info
    const members = await db
      .select({
        userId: tenantMemberships.user_id,
        name: users.name,
        email: users.email,
        joinedAt: tenantMemberships.joined_at,
        notes: tenantMemberships.notes,
        tags: tenantMemberships.tags,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.user_id, users.id))
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.role, "customer"),
        ),
      )
      .orderBy(desc(tenantMemberships.joined_at));

    // Enrich with booking counts, spend, and last visit
    const result = await Promise.all(
      members.map(async (member) => {
        const [bookingStats] = await db
          .select({ count: count() })
          .from(bookings)
          .where(
            and(
              eq(bookings.tenant_id, tenantId),
              eq(bookings.customer_id, member.userId),
            ),
          );

        const [paymentStats] = await db
          .select({ total: sum(payments.amount) })
          .from(payments)
          .where(
            and(
              eq(payments.tenant_id, tenantId),
              eq(payments.customer_id, member.userId),
              eq(payments.status, "succeeded"),
            ),
          );

        const [posStats] = await db
          .select({ total: sum(posTransactions.total) })
          .from(posTransactions)
          .where(
            and(
              eq(posTransactions.tenant_id, tenantId),
              eq(posTransactions.customer_id, member.userId),
              eq(posTransactions.status, "completed"),
            ),
          );

        const [lastBooking] = await db
          .select({ lastVisit: max(bookings.start_time) })
          .from(bookings)
          .where(
            and(
              eq(bookings.tenant_id, tenantId),
              eq(bookings.customer_id, member.userId),
            ),
          );

        const [lastPos] = await db
          .select({ lastVisit: max(posTransactions.created_at) })
          .from(posTransactions)
          .where(
            and(
              eq(posTransactions.tenant_id, tenantId),
              eq(posTransactions.customer_id, member.userId),
            ),
          );

        const totalSpend =
          Number(paymentStats?.total ?? 0) + Number(posStats?.total ?? 0);

        const bookingLastVisit = lastBooking?.lastVisit?.getTime() ?? 0;
        const posLastVisit = lastPos?.lastVisit?.getTime() ?? 0;
        const lastVisit =
          bookingLastVisit || posLastVisit
            ? new Date(Math.max(bookingLastVisit, posLastVisit))
            : null;

        return {
          id: member.userId,
          name: member.name,
          email: member.email,
          joinedAt: member.joinedAt,
          bookingCount: Number(bookingStats?.count ?? 0),
          totalSpend,
          lastVisit,
          notes: member.notes,
          tags: member.tags,
        };
      }),
    );

    return c.json(success(result));
  },
);

// GET /tenants/:tenantId/customers/:customerId
app.get(
  "/:customerId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const customerId = c.req.param("customerId");

    const [member] = await db
      .select({
        userId: tenantMemberships.user_id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatar_url,
        joinedAt: tenantMemberships.joined_at,
        notes: tenantMemberships.notes,
        tags: tenantMemberships.tags,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.user_id, users.id))
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, customerId),
          eq(tenantMemberships.role, "customer"),
        ),
      )
      .limit(1);

    if (!member) return c.json(error("NOT_FOUND", "Customer not found"), 404);

    // Recent bookings
    const recentBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.tenant_id, tenantId),
          eq(bookings.customer_id, customerId),
        ),
      )
      .orderBy(desc(bookings.created_at))
      .limit(5);

    // Recent orders (POS transactions for this customer)
    const recentOrders = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          eq(posTransactions.customer_id, customerId),
        ),
      )
      .orderBy(desc(posTransactions.created_at))
      .limit(5);

    // Loyalty balance (if exists)
    let loyaltyBalance = null;
    try {
      const { loyaltyPoints } = await import("@timeo/db/schema");
      const [lp] = await db
        .select()
        .from(loyaltyPoints)
        .where(
          and(
            eq(loyaltyPoints.tenant_id, tenantId),
            eq(loyaltyPoints.user_id, customerId),
          ),
        )
        .limit(1);
      if (lp) {
        loyaltyBalance = {
          balance: lp.balance,
          lifetimeEarned: lp.lifetime_earned,
          lifetimeRedeemed: lp.lifetime_redeemed,
          tier: lp.tier,
        };
      }
    } catch {
      // loyalty table may not exist yet
    }

    return c.json(
      success({
        ...member,
        recentBookings,
        recentOrders,
        loyaltyBalance,
      }),
    );
  },
);

// PATCH /tenants/:tenantId/customers/:customerId
app.patch(
  "/:customerId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", UpdateCustomerSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const customerId = c.req.param("customerId");
    const body = c.req.valid("json");

    const updates: Record<string, unknown> = {};
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.tags !== undefined) updates.tags = body.tags;

    if (Object.keys(updates).length === 0) {
      return c.json(success({ message: "No changes" }));
    }

    await db
      .update(tenantMemberships)
      .set(updates)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, customerId),
        ),
      );

    return c.json(success({ message: "Updated" }));
  },
);

export { app as customersRouter };
