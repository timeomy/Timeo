import { Hono } from "hono";
import { db } from "@timeo/db";
import { payments } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as PaymentService from "../services/payment.service.js";

const app = new Hono();

// GET /tenants/:tenantId/payments
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.tenant_id, tenantId))
      .orderBy(desc(payments.created_at));
    return c.json(success(rows));
  },
);

// GET /tenants/:tenantId/payments/:paymentId
app.get(
  "/:paymentId",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, c.req.param("paymentId")))
      .limit(1);
    if (!row) return c.json(error("NOT_FOUND", "Payment not found"), 404);
    return c.json(success(row));
  },
);

// POST /tenants/:tenantId/payments - create payment
app.post("/", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");
  const body = await c.req.json();

  try {
    const paymentId = await PaymentService.createPayment({
      tenantId,
      customerId: user.id,
      amount: body.amount,
      currency: body.currency,
      orderId: body.orderId,
      bookingId: body.bookingId,
      gateway: body.gateway ?? "stripe",
    });
    return c.json(success({ paymentId }), 201);
  } catch (err) {
    return c.json(error("PAYMENT_ERROR", (err as Error).message), 422);
  }
});

export { app as paymentsRouter };
