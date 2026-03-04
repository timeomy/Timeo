import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { products, stockMovements } from "@timeo/db/schema";
import { and, eq, desc, isNotNull, lte } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateProductSchema, UpdateProductSchema, AdjustStockSchema } from "../lib/validation.js";

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

// GET /tenants/:tenantId/products/low-stock
app.get(
  "/low-stock",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenant_id, tenantId),
          isNotNull(products.stock_quantity),
          lte(products.stock_quantity, products.low_stock_threshold),
        ),
      )
      .orderBy(products.stock_quantity);
    return c.json(success(rows));
  },
);

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
      sku: body.sku ?? null,
      stock_quantity: body.stockQuantity ?? null,
      low_stock_threshold: body.lowStockThreshold ?? 5,
    });

    return c.json(success({ id }), 201);
  },
);

app.patch(
  "/:productId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", UpdateProductSchema),
  async (c) => {
    const body = c.req.valid("json");
    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
    if (body.sku !== undefined) updates.sku = body.sku;
    if (body.stockQuantity !== undefined) updates.stock_quantity = body.stockQuantity;
    if (body.lowStockThreshold !== undefined) updates.low_stock_threshold = body.lowStockThreshold;

    await db
      .update(products)
      .set(updates)
      .where(eq(products.id, c.req.param("productId")));
    return c.json(success({ message: "Updated" }));
  },
);

// PATCH /tenants/:tenantId/products/:productId/stock
app.patch(
  "/:productId/stock",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", AdjustStockSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const productId = c.req.param("productId");
    const body = c.req.valid("json");

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenant_id, tenantId)))
      .limit(1);

    if (!product) return c.json(error("NOT_FOUND", "Product not found"), 404);

    const currentStock = product.stock_quantity ?? 0;
    const newStock = currentStock + body.delta;

    if (newStock < 0) {
      return c.json(
        error("INSUFFICIENT_STOCK", "Stock quantity would go negative"),
        422,
      );
    }

    await db
      .update(products)
      .set({ stock_quantity: newStock, updated_at: new Date() })
      .where(eq(products.id, productId));

    await db.insert(stockMovements).values({
      id: generateId(),
      tenant_id: tenantId,
      product_id: productId,
      delta: body.delta,
      stock_before: currentStock,
      stock_after: newStock,
      reason: body.reason,
      actor_id: user.id,
    });

    return c.json(success({ stockQuantity: newStock }));
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
