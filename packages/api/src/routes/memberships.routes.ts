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

    await db.insert(memberships).values({
      id,
      tenant_id: tenantId,
      name: body.name,
      description: body.description,
      price: body.price,
      currency: body.currency,
      interval: body.interval,
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
