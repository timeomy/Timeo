import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "./lib/middleware";

export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await requireTenantAccess(ctx, order.tenantId);

    return await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});
