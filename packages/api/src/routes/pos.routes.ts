import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { posTransactions, users } from "@timeo/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreatePosTransactionSchema } from "../lib/validation.js";
import * as PosService from "../services/pos.service.js";
import * as RMService from "../services/revenue-monster.service.js";

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

// GET /tenants/:tenantId/pos/daily-summary
app.get(
  "/daily-summary",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const rows = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          gte(posTransactions.created_at, startOfToday),
        ),
      );

    const byPaymentMethod: Record<string, { count: number; revenue: number }> = {};
    let totalRevenue = 0;

    for (const row of rows) {
      totalRevenue += row.total;
      const method = row.payment_method;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, revenue: 0 };
      }
      byPaymentMethod[method].count += 1;
      byPaymentMethod[method].revenue += row.total;
    }

    return c.json(
      success({
        totalTransactions: rows.length,
        totalRevenue,
        averageTransaction: rows.length > 0 ? Math.round(totalRevenue / rows.length) : 0,
        byPaymentMethod,
      }),
    );
  },
);

// GET /tenants/:tenantId/pos/monthly-statement
app.get(
  "/monthly-statement",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          gte(posTransactions.created_at, startOfMonth),
        ),
      );

    const dayMap: Record<string, { transactions: number; revenue: number }> = {};
    let totalRevenue = 0;

    for (const row of rows) {
      totalRevenue += row.total;
      const date = new Date(row.created_at).toISOString().slice(0, 10);
      if (!dayMap[date]) {
        dayMap[date] = { transactions: 0, revenue: 0 };
      }
      dayMap[date].transactions += 1;
      dayMap[date].revenue += row.total;
    }

    const days = Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return c.json(
      success({
        days,
        totalRevenue,
        totalTransactions: rows.length,
      }),
    );
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

    let customerId = body.customerId;

    // If customerEmail is provided instead of customerId, look up the user
    if (!customerId && body.customerEmail) {
      const [found] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.customerEmail))
        .limit(1);
      if (!found) {
        return c.json(
          error("NOT_FOUND", `No user found with email ${body.customerEmail}`),
          404,
        );
      }
      customerId = found.id;
    }

    if (!customerId) {
      return c.json(
        error("VALIDATION_ERROR", "Either customerId or customerEmail is required"),
        400,
      );
    }

    try {
      const result = await PosService.createPosTransaction({
        tenantId,
        customerId,
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

// POST /tenants/:tenantId/pos/duitnow-qr
const DuitNowQRSchema = z.object({
  amount: z.number().int().min(1),
  orderId: z.string().min(1),
  description: z.string().optional(),
});

app.post(
  "/duitnow-qr",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", DuitNowQRSchema),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const result = await RMService.createDuitNowQR({
        amount: body.amount,
        orderId: body.orderId,
        description: body.description ?? "POS Payment",
      });
      return c.json(success({ qrCodeUrl: result.qrCodeUrl, rmOrderId: result.rmOrderId }));
    } catch (err) {
      return c.json(
        error("RM_NOT_CONFIGURED", "Revenue Monster not configured"),
        422,
      );
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

// DELETE /tenants/:tenantId/pos/:txId
app.delete(
  "/:txId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const txId = c.req.param("txId");

    const [row] = await db
      .select({ id: posTransactions.id })
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.id, txId),
          eq(posTransactions.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!row) {
      return c.json(error("NOT_FOUND", "Transaction not found"), 404);
    }

    await db.delete(posTransactions).where(eq(posTransactions.id, txId));
    return c.body(null, 204);
  },
);

export { app as posRouter };
