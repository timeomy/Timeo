import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { memberships, subscriptions, users } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateMembershipPlanSchema } from "../lib/validation.js";
import { sanitizePlanName } from "../lib/plan-name.js";

const app = new Hono();

// GET /tenants/:tenantId/memberships - list plans
app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.tenant_id, tenantId))
    .orderBy(desc(memberships.created_at));
  return c.json(success(rows));
});

// GET /tenants/:tenantId/memberships/:planId
app.get("/:planId", authMiddleware, tenantMiddleware, async (c) => {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, c.req.param("planId")))
    .limit(1);
  if (!row) return c.json(error("NOT_FOUND", "Membership plan not found"), 404);
  return c.json(success(row));
});

// POST /tenants/:tenantId/memberships - create plan (admin)
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateMembershipPlanSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();
    const sanitizedName = sanitizePlanName(body.name);

    if (!sanitizedName) {
      return c.json(error("VALIDATION_ERROR", "Plan name is invalid"), 422);
    }

    await db.insert(memberships).values({
      id,
      tenant_id: tenantId,
      name: sanitizedName,
      description: body.description,
      price: body.price,
      currency: body.currency,
      interval: body.interval,
      duration_months: body.durationMonths ?? null,
      plan_type: body.planType ?? "all_access",
      features: body.features,
      is_active: body.isActive,
    });

    return c.json(success({ id }), 201);
  },
);

// GET /tenants/:tenantId/memberships/subscriptions/mine
app.get("/subscriptions/mine", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");

  const rows = await db
    .select({
      subscription: subscriptions,
      plan: { name: memberships.name, price: memberships.price },
    })
    .from(subscriptions)
    .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
    .where(
      and(
        eq(subscriptions.tenant_id, tenantId),
        eq(subscriptions.customer_id, user.id),
      ),
    );

  return c.json(success(rows));
});

// GET /tenants/:tenantId/memberships/subscriptions - admin list all
app.get(
  "/subscriptions",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");

    const rows = await db
      .select({
        id: subscriptions.id,
        customerId: subscriptions.customer_id,
        memberName: users.name,
        memberEmail: users.email,
        membershipId: subscriptions.membership_id,
        planName: memberships.name,
        planPrice: memberships.price,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.current_period_start,
        currentPeriodEnd: subscriptions.current_period_end,
        cancelAtPeriodEnd: subscriptions.cancel_at_period_end,
        updatedAt: subscriptions.updated_at,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.customer_id, users.id))
      .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
      .where(eq(subscriptions.tenant_id, tenantId))
      .orderBy(desc(subscriptions.current_period_end));

    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/memberships/:planId/subscribe
app.post(
  "/:planId/subscribe",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const planId = c.req.param("planId");

    const [plan] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, planId), eq(memberships.tenant_id, tenantId)))
      .limit(1);
    if (!plan) return c.json(error("NOT_FOUND", "Plan not found"), 404);
    if (!plan.is_active) return c.json(error("INACTIVE", "Plan is not active"), 422);

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const subId = generateId();
    await db.insert(subscriptions).values({
      id: subId,
      tenant_id: tenantId,
      customer_id: user.id,
      membership_id: planId,
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd,
    });

    return c.json(success({ subscriptionId: subId }), 201);
  },
);

export { app as membershipsRouter };
