import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { vouchers } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateVoucherSchema } from "../lib/validation.js";
import * as VoucherService from "../services/voucher.service.js";

const app = new Hono();

// GET /tenants/:tenantId/vouchers
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.tenant_id, tenantId))
      .orderBy(desc(vouchers.created_at));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/vouchers
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateVoucherSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.insert(vouchers).values({
      id,
      tenant_id: tenantId,
      code: body.code,
      type: body.type,
      value: body.value,
      max_uses: body.maxUses ?? null,
      expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
      source: body.source,
      partner_name: body.partnerName ?? null,
      description: body.description ?? null,
    });

    return c.json(success({ id }), 201);
  },
);

// POST /tenants/:tenantId/vouchers/:voucherId/redeem
app.post(
  "/:voucherId/redeem",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const voucherId = c.req.param("voucherId");
    const body = await c.req.json();

    try {
      const discountAmount = await VoucherService.redeemVoucher({
        tenantId,
        voucherId,
        userId: user.id,
        bookingId: body.bookingId,
        orderId: body.orderId,
        orderAmount: body.orderAmount,
      });
      return c.json(success({ discountAmount }));
    } catch (err) {
      return c.json(error("VOUCHER_ERROR", (err as Error).message), 422);
    }
  },
);

// DELETE /tenants/:tenantId/vouchers/:voucherId (deactivate)
app.delete(
  "/:voucherId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    await db
      .update(vouchers)
      .set({ is_active: false })
      .where(eq(vouchers.id, c.req.param("voucherId")));
    return c.json(success({ message: "Voucher deactivated" }));
  },
);

export { app as vouchersRouter };
