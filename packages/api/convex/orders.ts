import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { orderStatusValidator } from "./validators";
import { internal } from "./_generated/api";

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    return await Promise.all(
      orders.map(async (o) => {
        const customer = await ctx.db.get(o.customerId);
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect();
        return {
          ...o,
          customerName: customer?.name ?? "Unknown",
          itemCount: items.length,
        };
      })
    );
  },
});

export const listByCustomer = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .collect();

    const filtered = orders.filter((o) => o.tenantId === args.tenantId);

    return await Promise.all(
      filtered.map(async (o) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect();
        return {
          ...o,
          items,
        };
      })
    );
  },
});

export const getById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await requireTenantAccess(ctx, order.tenantId);

    const customer = await ctx.db.get(order.customerId);
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      ...order,
      customerName: customer?.name ?? "Unknown",
      customerEmail: customer?.email,
      items,
    };
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    if (args.items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    let totalAmount = 0;
    let currency = "MYR";
    const snapshots: Array<{
      productId: (typeof args.items)[number]["productId"];
      quantity: number;
      snapshotPrice: number;
      snapshotName: string;
    }> = [];

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.tenantId !== args.tenantId) {
        throw new Error(`Product ${item.productId} not found in this tenant`);
      }
      if (!product.isActive) {
        throw new Error(`Product "${product.name}" is not available`);
      }
      if (item.quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      totalAmount += product.price * item.quantity;
      currency = product.currency;
      snapshots.push({
        productId: item.productId,
        quantity: item.quantity,
        snapshotPrice: product.price,
        snapshotName: product.name,
      });
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      tenantId: args.tenantId,
      customerId: user._id,
      status: "awaiting_payment",
      totalAmount,
      currency,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    for (const snap of snapshots) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: snap.productId,
        quantity: snap.quantity,
        snapshotPrice: snap.snapshotPrice,
        snapshotName: snap.snapshotName,
      });
    }

    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const { user } = await requireRole(ctx, order.tenantId, [
      "admin",
      "staff",
    ]);

    const validTransitions: Record<string, string[]> = {
      awaiting_payment: ["pending", "confirmed", "cancelled"],
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["completed"],
      completed: [],
      cancelled: [],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(args.status)) {
      throw new Error(
        `Cannot transition from "${order.status}" to "${args.status}"`
      );
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: order.tenantId,
      actorId: user._id,
      action: `order.${args.status}`,
      resource: "orders",
      resourceId: args.orderId,
      metadata: { previousStatus: order.status },
    });

    // Send order update notification
    await ctx.scheduler.runAfter(
      0,
      internal.actions.notifications.sendOrderUpdate,
      { orderId: args.orderId, newStatus: args.status }
    );
  },
});
