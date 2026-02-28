import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { products } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateProductSchema } from "../lib/validation.js";

const app = new Hono();

app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.tenant_id, tenantId))
    .orderBy(desc(products.created_at));
  return c.json(success(rows));
});

app.get("/:productId", authMiddleware, tenantMiddleware, async (c) => {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, c.req.param("productId")))
    .limit(1);
  if (!row) return c.json(error("NOT_FOUND", "Product not found"), 404);
  return c.json(success(row));
});

app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateProductSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.insert(products).values({
      id,
      tenant_id: tenantId,
      created_by: user.id,
      name: body.name,
      description: body.description,
      price: body.price,
      currency: body.currency,
      image_url: body.imageUrl ?? null,
      is_active: body.isActive,
    });

    return c.json(success({ id }), 201);
  },
);

app.patch(
  "/:productId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const body = await c.req.json();
    await db
      .update(products)
      .set({ ...body, updated_at: new Date() })
      .where(eq(products.id, c.req.param("productId")));
    return c.json(success({ message: "Updated" }));
  },
);

app.delete(
  "/:productId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    await db
      .update(products)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(products.id, c.req.param("productId")));
    return c.json(success({ message: "Deactivated" }));
  },
);

export { app as productsRouter };
