import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { giftCards, giftCardTransactions } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateGiftCardSchema } from "../lib/validation.js";
import * as GiftCardService from "../services/gift-card.service.js";

const app = new Hono();

// GET /tenants/:tenantId/gift-cards
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(giftCards)
      .where(eq(giftCards.tenant_id, tenantId))
      .orderBy(desc(giftCards.created_at));
    return c.json(success(rows));
  },
);

// GET /tenants/:tenantId/gift-cards/by-code/:code
app.get(
  "/by-code/:code",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");
    const code = c.req.param("code");
    const [card] = await db
      .select()
      .from(giftCards)
      .where(and(eq(giftCards.code, code), eq(giftCards.tenant_id, tenantId)))
      .limit(1);
    if (!card) return c.json(error("NOT_FOUND", "Gift card not found"), 404);

    const transactions = await db
      .select()
      .from(giftCardTransactions)
      .where(eq(giftCardTransactions.gift_card_id, card.id))
      .orderBy(desc(giftCardTransactions.created_at));

    return c.json(success({ ...card, transactions }));
  },
);

// POST /tenants/:tenantId/gift-cards
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreateGiftCardSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const result = await GiftCardService.createGiftCard({
        tenantId,
        initialBalance: body.initialBalance,
        currency: body.currency,
        purchaserName: body.purchaserName,
        purchaserEmail: body.purchaserEmail,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        message: body.message,
        expiresAt: body.expiresAt,
        createdBy: user.id,
      });
      return c.json(success(result), 201);
    } catch (err) {
      return c.json(error("GIFT_CARD_ERROR", (err as Error).message), 422);
    }
  },
);

// POST /tenants/:tenantId/gift-cards/:code/redeem
app.post(
  "/:code/redeem",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const code = c.req.param("code");
    const body = await c.req.json();

    try {
      const result = await GiftCardService.redeemGiftCard({
        tenantId,
        code,
        amount: body.amount,
        actorId: user.id,
        posTransactionId: body.posTransactionId,
      });
      return c.json(success(result));
    } catch (err) {
      return c.json(error("GIFT_CARD_ERROR", (err as Error).message), 422);
    }
  },
);

export { app as giftCardsRouter };
