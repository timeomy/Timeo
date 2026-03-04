import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { EarnPointsSchema } from "../lib/validation.js";
import * as LoyaltyService from "../services/loyalty.service.js";

const app = new Hono();

// GET /tenants/:tenantId/loyalty/balance/:userId
app.get(
  "/balance/:userId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const userId = c.req.param("userId");

    try {
      const data = await LoyaltyService.getBalance(tenantId, userId);
      return c.json(success(data));
    } catch (err) {
      return c.json(error("LOYALTY_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /tenants/:tenantId/loyalty/history/:userId
app.get(
  "/history/:userId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const userId = c.req.param("userId");

    try {
      const data = await LoyaltyService.getHistory(tenantId, userId);
      return c.json(success(data));
    } catch (err) {
      return c.json(error("LOYALTY_ERROR", (err as Error).message), 500);
    }
  },
);

// POST /tenants/:tenantId/loyalty/earn — admin manually award points
app.post(
  "/earn",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", EarnPointsSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      await LoyaltyService.adjustPoints({
        tenantId,
        userId: body.userId,
        delta: body.points,
        note: body.note ?? "Manual award by admin",
        actorId: user.id,
      });
      const balance = await LoyaltyService.getBalance(tenantId, body.userId);
      return c.json(success(balance));
    } catch (err) {
      return c.json(error("LOYALTY_ERROR", (err as Error).message), 422);
    }
  },
);

// POST /tenants/:tenantId/loyalty/redeem — customer redeem points
app.post(
  "/redeem",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = await c.req.json();

    try {
      const result = await LoyaltyService.redeemPoints({
        tenantId,
        userId: user.id,
        points: body.points,
        referenceType: body.orderId ? "order" : "manual",
        referenceId: body.orderId ?? "",
      });

      if (!result.success) {
        return c.json(error("INSUFFICIENT_POINTS", "Not enough loyalty points"), 422);
      }

      return c.json(success(result));
    } catch (err) {
      return c.json(error("LOYALTY_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as loyaltyRouter };
