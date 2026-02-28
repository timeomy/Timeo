import { db } from "@timeo/db";
import { vouchers, voucherRedemptions, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

export async function redeemVoucher(input: {
  tenantId: string;
  voucherId: string;
  userId: string;
  bookingId?: string;
  orderId?: string;
  orderAmount: number;
}) {
  const [voucher] = await db
    .select()
    .from(vouchers)
    .where(
      and(eq(vouchers.id, input.voucherId), eq(vouchers.tenant_id, input.tenantId)),
    )
    .limit(1);

  if (!voucher) throw new Error("Voucher not found");
  if (!voucher.is_active) throw new Error("Voucher is no longer active");
  if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
    throw new Error("Voucher has reached maximum uses");
  }
  if (voucher.expires_at && new Date() > voucher.expires_at) {
    throw new Error("Voucher has expired");
  }

  let discountAmount = 0;
  if (voucher.type === "percentage") {
    discountAmount = Math.round((input.orderAmount * voucher.value) / 100);
  } else if (voucher.type === "fixed") {
    discountAmount = Math.min(voucher.value, input.orderAmount);
  }

  await db.insert(voucherRedemptions).values({
    id: generateId(),
    tenant_id: input.tenantId,
    voucher_id: input.voucherId,
    user_id: input.userId,
    discount_amount: discountAmount,
    booking_id: input.bookingId ?? null,
    order_id: input.orderId ?? null,
  });

  await db
    .update(vouchers)
    .set({ used_count: voucher.used_count + 1 })
    .where(eq(vouchers.id, input.voucherId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.userId,
    action: "voucher.redeemed",
    resource: "vouchers",
    resource_id: input.voucherId,
    metadata: { discountAmount, code: voucher.code },
  });

  return discountAmount;
}
