import { db } from "@timeo/db";
import { orders, orderItems, products, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";

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
    action: "order.created",
    resource: "orders",
    resource_id: orderId,
    metadata: { itemCount: itemValues.length, totalAmount },
  });

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
    action: `order.${status}`,
    resource: "orders",
    resource_id: orderId,
  });

  emitToTenant(order.tenant_id, SocketEvents.ORDER_UPDATED, {
    orderId,
    status,
  });
}
