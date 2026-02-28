import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { posTransactions, users } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreatePosTransactionSchema } from "../lib/validation.js";
import * as PosService from "../services/pos.service.js";

const app = new Hono();

// GET /tenants/:tenantId/pos - list transactions
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select({
        transaction: posTransactions,
        customer: { name: users.name },
      })
      .from(posTransactions)
      .leftJoin(users, eq(posTransactions.customer_id, users.id))
      .where(eq(posTransactions.tenant_id, tenantId))
      .orderBy(desc(posTransactions.created_at));
    return c.json(success(rows));
  },
);

// GET /tenants/:tenantId/pos/:txId
app.get(
  "/:txId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const [row] = await db
      .select()
      .from(posTransactions)
      .where(eq(posTransactions.id, c.req.param("txId")))
      .limit(1);
    if (!row) return c.json(error("NOT_FOUND", "Transaction not found"), 404);
    return c.json(success(row));
  },
);

// POST /tenants/:tenantId/pos
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreatePosTransactionSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const result = await PosService.createPosTransaction({
        tenantId,
        customerId: body.customerId,
        staffId: user.id,
        items: body.items,
        paymentMethod: body.paymentMethod,
        voucherId: body.voucherId,
        discount: body.discount,
        notes: body.notes,
      });
      return c.json(success(result), 201);
    } catch (err) {
      return c.json(error("POS_ERROR", (err as Error).message), 422);
    }
  },
);

// PATCH /tenants/:tenantId/pos/:txId/void
app.patch(
  "/:txId/void",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const user = c.get("user");
    try {
      await PosService.voidTransaction(c.req.param("txId"), user.id);
      return c.json(success({ message: "Transaction voided" }));
    } catch (err) {
      return c.json(error("POS_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as posRouter };
