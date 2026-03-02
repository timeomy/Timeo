import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { plans } from "@timeo/db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const planSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  price_cents: z.number().int().min(0),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  features: z.array(z.string()).default([]),
  limits: z.record(z.unknown()).default({}),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

const app = new Hono();

// GET /plans — list all plans
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db.select().from(plans).orderBy(asc(plans.sort_order));
  return c.json(success(rows));
});

// POST /plans — create plan
app.post(
  "/",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", planSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, body.slug))
      .limit(1);

    if (existing) {
      return c.json(error("SLUG_TAKEN", "Plan slug already in use"), 409);
    }

    const id = generateId();
    await db.insert(plans).values({ id, ...body });

    await insertAudit(
      user.id,
      "platform_admin",
      "plan.created",
      "plan",
      id,
      { name: body.name, slug: body.slug },
      ip,
    );

    const [created] = await db.select().from(plans).where(eq(plans.id, id));
    return c.json(success(created), 201);
  },
);

// PUT /plans/:id — update plan
app.put(
  "/:id",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", planSchema.partial()),
  async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!existing) {
      return c.json(error("NOT_FOUND", "Plan not found"), 404);
    }

    await db.update(plans).set(body).where(eq(plans.id, id));

    await insertAudit(
      user.id,
      "platform_admin",
      "plan.updated",
      "plan",
      id,
      { changes: body },
      ip,
    );

    const [updated] = await db.select().from(plans).where(eq(plans.id, id));
    return c.json(success(updated));
  },
);

// DELETE /plans/:id — delete plan
app.delete("/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ip = getClientIp(c.req.raw.headers);

  const [existing] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, id))
    .limit(1);

  if (!existing) {
    return c.json(error("NOT_FOUND", "Plan not found"), 404);
  }

  await db.delete(plans).where(eq(plans.id, id));

  await insertAudit(
    user.id,
    "platform_admin",
    "plan.deleted",
    "plan",
    id,
    { name: existing.name },
    ip,
  );

  return c.json(success({ message: "Plan deleted" }));
});

export { app as plansRouter };
