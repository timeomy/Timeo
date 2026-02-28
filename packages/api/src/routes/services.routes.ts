import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { services } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateServiceSchema } from "../lib/validation.js";

const app = new Hono();

app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.tenant_id, tenantId))
    .orderBy(desc(services.created_at));
  return c.json(success(rows));
});

app.get("/:serviceId", authMiddleware, tenantMiddleware, async (c) => {
  const [row] = await db
    .select()
    .from(services)
    .where(eq(services.id, c.req.param("serviceId")))
    .limit(1);
  if (!row) return c.json(error("NOT_FOUND", "Service not found"), 404);
  return c.json(success(row));
});

app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateServiceSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.insert(services).values({
      id,
      tenant_id: tenantId,
      created_by: user.id,
      name: body.name,
      description: body.description,
      price: body.price,
      currency: body.currency,
      duration_minutes: body.durationMinutes,
      image_url: body.imageUrl ?? null,
      is_active: body.isActive,
    });

    return c.json(success({ id }), 201);
  },
);

app.patch(
  "/:serviceId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const body = await c.req.json();
    await db
      .update(services)
      .set({ ...body, updated_at: new Date() })
      .where(eq(services.id, c.req.param("serviceId")));
    return c.json(success({ message: "Updated" }));
  },
);

app.delete(
  "/:serviceId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    await db
      .update(services)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(services.id, c.req.param("serviceId")));
    return c.json(success({ message: "Deactivated" }));
  },
);

export { app as servicesRouter };
