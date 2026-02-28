import { db } from "@timeo/db";
import { giftCards, giftCardTransactions, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

export async function createGiftCard(input: {
  tenantId: string;
  initialBalance: number;
  currency?: string;
  purchaserName?: string;
  purchaserEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  expiresAt?: string;
  createdBy: string;
}) {
  const cardId = generateId();
  const code = `GC-${generateId().slice(0, 8).toUpperCase()}`;

  await db.insert(giftCards).values({
    id: cardId,
    tenant_id: input.tenantId,
    code,
    initial_balance: input.initialBalance,
    current_balance: input.initialBalance,
    currency: input.currency ?? "MYR",
    purchaser_name: input.purchaserName ?? null,
    purchaser_email: input.purchaserEmail ?? null,
    recipient_name: input.recipientName ?? null,
    recipient_email: input.recipientEmail ?? null,
    message: input.message ?? null,
    expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
  });

  await db.insert(giftCardTransactions).values({
    id: generateId(),
    gift_card_id: cardId,
    tenant_id: input.tenantId,
    type: "purchase",
    amount: input.initialBalance,
    balance_after: input.initialBalance,
    created_by: input.createdBy,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.createdBy,
    action: "gift_card.created",
    resource: "gift_cards",
    resource_id: cardId,
    metadata: { code, balance: input.initialBalance },
  });

  return { cardId, code };
}

export async function redeemGiftCard(input: {
  tenantId: string;
  code: string;
  amount: number;
  actorId: string;
  posTransactionId?: string;
}) {
  const [card] = await db
    .select()
    .from(giftCards)
    .where(
      and(eq(giftCards.code, input.code), eq(giftCards.tenant_id, input.tenantId)),
    )
    .limit(1);

  if (!card) throw new Error("Gift card not found");
  if (card.status !== "active") throw new Error("Gift card is not active");
  if (card.expires_at && new Date() > card.expires_at) {
    throw new Error("Gift card has expired");
  }
  if (card.current_balance < input.amount) {
    throw new Error("Insufficient gift card balance");
  }

  const newBalance = card.current_balance - input.amount;
  const newStatus = newBalance === 0 ? "depleted" : "active";

  await db
    .update(giftCards)
    .set({
      current_balance: newBalance,
      status: newStatus as typeof card.status,
    })
    .where(eq(giftCards.id, card.id));

  await db.insert(giftCardTransactions).values({
    id: generateId(),
    gift_card_id: card.id,
    tenant_id: input.tenantId,
    type: "redemption",
    amount: input.amount,
    balance_after: newBalance,
    pos_transaction_id: input.posTransactionId ?? null,
    created_by: input.actorId,
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    action: "gift_card.redeemed",
    resource: "gift_cards",
    resource_id: card.id,
    metadata: { amount: input.amount, balanceAfter: newBalance },
  });

  return { remainingBalance: newBalance };
}
