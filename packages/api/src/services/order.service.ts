import { db } from "@timeo/db";
import { orders, orderItems, products, stockMovements, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";
import * as LoyaltyService from "./loyalty.service.js";

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export async function createOrder(input: {
  tenantId: string;
  customerId: string;
  items: OrderItemInput[];
  notes?: string;
}) {
  const orderId = generateId();
  let totalAmount = 0;
  const itemValues: Array<{
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    snapshot_price: number;
    snapshot_name: string;
  }> = [];

  for (const item of input.items) {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, item.productId),
          eq(products.tenant_id, input.tenantId),
        ),
      )
      .limit(1);

    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (!product.is_active) throw new Error(`Product ${product.name} is not available`);

    totalAmount += product.price * item.quantity;
    itemValues.push({
      id: generateId(),
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      snapshot_price: product.price,
      snapshot_name: product.name,
    });
  }

  await db.insert(orders).values({
    id: orderId,
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    total_amount: totalAmount,
    notes: input.notes ?? null,
  });

  if (itemValues.length > 0) {
    await db.insert(orderItems).values(itemValues);
  }

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.customerId,
    actor_role: "customer",
    action: "order.created",
    resource_type: "order",
    resource_id: orderId,
    details: { itemCount: itemValues.length, totalAmount },
  });

  // Decrement stock for product items
  for (const item of itemValues) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.product_id))
      .limit(1);

    if (product && product.stock_quantity !== null) {
      const newStock = product.stock_quantity - item.quantity;
      await db
        .update(products)
        .set({ stock_quantity: Math.max(0, newStock), updated_at: new Date() })
        .where(eq(products.id, item.product_id));

      await db.insert(stockMovements).values({
        id: generateId(),
        tenant_id: input.tenantId,
        product_id: item.product_id,
        delta: -item.quantity,
        stock_before: product.stock_quantity,
        stock_after: Math.max(0, newStock),
        reason: "order",
        reference_id: orderId,
        actor_id: input.customerId,
      });
    }
  }

  emitToTenant(input.tenantId, SocketEvents.ORDER_CREATED, {
    orderId,
    tenantId: input.tenantId,
  });

  return { orderId, totalAmount };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  actorId: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) throw new Error("Order not found");

  await db
    .update(orders)
    .set({ status: status as typeof order.status, updated_at: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: order.tenant_id,
    actor_id: actorId,
    actor_role: "staff",
    action: `order.${status}`,
    resource_type: "order",
    resource_id: orderId,
  });

  // Earn loyalty points on confirmation
  if (status === "confirmed") {
    try {
      await LoyaltyService.earnPoints({
        tenantId: order.tenant_id,
        userId: order.customer_id,
        amount: order.total_amount,
        referenceType: "order",
        referenceId: orderId,
      });
    } catch {
      // Don't fail order status update if loyalty fails
    }
  }

  emitToTenant(order.tenant_id, SocketEvents.ORDER_UPDATED, {
    orderId,
    status,
  });
}
