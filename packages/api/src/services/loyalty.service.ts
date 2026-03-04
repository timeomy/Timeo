import { db } from "@timeo/db";
import { loyaltyPoints, loyaltyTransactions } from "@timeo/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";

// Rules (hardcoded for now, configurable later):
// - 1 point per RM1 spent (amount in cents / 100)
// - 100 points = RM1 redeemable
// - Tiers: bronze (0), silver (500), gold (2000), platinum (5000) lifetime points

function computeTier(lifetimeEarned: number): string {
  if (lifetimeEarned >= 5000) return "platinum";
  if (lifetimeEarned >= 2000) return "gold";
  if (lifetimeEarned >= 500) return "silver";
  return "bronze";
}

async function getOrCreateBalance(tenantId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(loyaltyPoints)
    .where(
      and(
        eq(loyaltyPoints.tenant_id, tenantId),
        eq(loyaltyPoints.user_id, userId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const id = generateId();
  await db.insert(loyaltyPoints).values({
    id,
    tenant_id: tenantId,
    user_id: userId,
    balance: 0,
    lifetime_earned: 0,
    lifetime_redeemed: 0,
    tier: "bronze",
  });

  const [created] = await db
    .select()
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.id, id))
    .limit(1);

  return created!;
}

export async function earnPoints(input: {
  tenantId: string;
  userId: string;
  amount: number; // cents
  referenceType: "order" | "booking" | "pos_transaction";
  referenceId: string;
}): Promise<number> {
  const points = Math.floor(input.amount / 100); // 1 point per RM1
  if (points <= 0) return 0;

  const record = await getOrCreateBalance(input.tenantId, input.userId);
  const newBalance = record.balance + points;
  const newLifetimeEarned = record.lifetime_earned + points;
  const newTier = computeTier(newLifetimeEarned);

  await db
    .update(loyaltyPoints)
    .set({
      balance: newBalance,
      lifetime_earned: newLifetimeEarned,
      tier: newTier,
      updated_at: new Date(),
    })
    .where(eq(loyaltyPoints.id, record.id));

  await db.insert(loyaltyTransactions).values({
    id: generateId(),
    tenant_id: input.tenantId,
    user_id: input.userId,
    type: "earned",
    points,
    balance_after: newBalance,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
  });

  return points;
}

export async function redeemPoints(input: {
  tenantId: string;
  userId: string;
  points: number;
  referenceType: string;
  referenceId: string;
}): Promise<{ success: boolean; pointsRedeemed: number; valueRedeemed: number }> {
  const record = await getOrCreateBalance(input.tenantId, input.userId);

  if (record.balance < input.points) {
    return { success: false, pointsRedeemed: 0, valueRedeemed: 0 };
  }

  const newBalance = record.balance - input.points;
  const newLifetimeRedeemed = record.lifetime_redeemed + input.points;
  const valueRedeemed = input.points; // 100 points = RM1, value in cents

  await db
    .update(loyaltyPoints)
    .set({
      balance: newBalance,
      lifetime_redeemed: newLifetimeRedeemed,
      updated_at: new Date(),
    })
    .where(eq(loyaltyPoints.id, record.id));

  await db.insert(loyaltyTransactions).values({
    id: generateId(),
    tenant_id: input.tenantId,
    user_id: input.userId,
    type: "redeemed",
    points: input.points,
    balance_after: newBalance,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
  });

  return { success: true, pointsRedeemed: input.points, valueRedeemed };
}

export async function getBalance(
  tenantId: string,
  userId: string,
): Promise<{
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  tier: string;
}> {
  const record = await getOrCreateBalance(tenantId, userId);
  return {
    balance: record.balance,
    lifetimeEarned: record.lifetime_earned,
    lifetimeRedeemed: record.lifetime_redeemed,
    tier: record.tier,
  };
}

export async function adjustPoints(input: {
  tenantId: string;
  userId: string;
  delta: number;
  note: string;
  actorId: string;
}): Promise<void> {
  const record = await getOrCreateBalance(input.tenantId, input.userId);

  const newBalance = record.balance + input.delta;
  if (newBalance < 0) {
    throw new Error("Cannot adjust points below zero");
  }

  const updates: Record<string, unknown> = {
    balance: newBalance,
    updated_at: new Date(),
  };

  if (input.delta > 0) {
    updates.lifetime_earned = record.lifetime_earned + input.delta;
    updates.tier = computeTier(record.lifetime_earned + input.delta);
  }

  await db
    .update(loyaltyPoints)
    .set(updates)
    .where(eq(loyaltyPoints.id, record.id));

  await db.insert(loyaltyTransactions).values({
    id: generateId(),
    tenant_id: input.tenantId,
    user_id: input.userId,
    type: "adjusted",
    points: input.delta,
    balance_after: newBalance,
    note: input.note,
  });
}

export async function getHistory(
  tenantId: string,
  userId: string,
  limit = 50,
) {
  return db
    .select()
    .from(loyaltyTransactions)
    .where(
      and(
        eq(loyaltyTransactions.tenant_id, tenantId),
        eq(loyaltyTransactions.user_id, userId),
      ),
    )
    .orderBy(desc(loyaltyTransactions.created_at))
    .limit(limit);
}
