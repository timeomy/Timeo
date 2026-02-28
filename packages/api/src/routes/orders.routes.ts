import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { orders, orderItems, users } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateOrderSchema } from "../lib/validation.js";
import * as OrderService from "../services/order.service.js";

const app = new Hono();

// GET /tenants/:tenantId/orders - list (admin/staff see all, customer sees own)
app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      order: orders,
      customer: { name: users.name, email: users.email },
    })
    .from(orders)
    .leftJoin(users, eq(orders.customer_id, users.id))
    .where(eq(orders.tenant_id, tenantId))
    .orderBy(desc(orders.created_at));
  return c.json(success(rows));
});

// GET /tenants/:tenantId/orders/:orderId
app.get("/:orderId", authMiddleware, tenantMiddleware, async (c) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, c.req.param("orderId")))
    .limit(1);
  if (!order) return c.json(error("NOT_FOUND", "Order not found"), 404);

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.order_id, order.id));

  return c.json(success({ ...order, items }));
});

// POST /tenants/:tenantId/orders
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", CreateOrderSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const result = await OrderService.createOrder({
        tenantId,
        customerId: user.id,
        items: body.items,
        notes: body.notes,
      });
      return c.json(success(result), 201);
    } catch (err) {
      return c.json(error("ORDER_ERROR", (err as Error).message), 422);
    }
  },
);

// PATCH /tenants/:tenantId/orders/:orderId/status
app.patch(
  "/:orderId/status",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    try {
      await OrderService.updateOrderStatus(
        c.req.param("orderId"),
        body.status,
        user.id,
      );
      return c.json(success({ message: "Order status updated" }));
    } catch (err) {
      return c.json(error("ORDER_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as ordersRouter };
