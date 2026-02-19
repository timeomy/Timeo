import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireTenantAccess } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { membership } = await requireTenantAccess(ctx, args.tenantId);

    if (membership.role === "customer") {
      return await ctx.db
        .query("products")
        .withIndex("by_tenant_active", (q) =>
          q.eq("tenantId", args.tenantId).eq("isActive", true)
        )
        .collect();
    }

    return await ctx.db
      .query("products")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    await requireTenantAccess(ctx, product.tenantId);
    return product;
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const now = Date.now();

    const productId = await ctx.db.insert("products", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      price: args.price,
      currency: args.currency ?? "MYR",
      imageUrl: args.imageUrl,
      isActive: true,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "product.created",
      resource: "products",
      resourceId: productId,
    });

    return productId;
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const { user } = await requireRole(ctx, product.tenantId, [
      "admin",
      "staff",
    ]);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;

    await ctx.db.patch(args.productId, updates);

    await insertAuditLog(ctx, {
      tenantId: product.tenantId,
      actorId: user._id,
      action: "product.updated",
      resource: "products",
      resourceId: args.productId,
      metadata: { fields: Object.keys(updates) },
    });
  },
});

export const toggleActive = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const { user } = await requireRole(ctx, product.tenantId, ["admin"]);

    await ctx.db.patch(args.productId, {
      isActive: !product.isActive,
      updatedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: product.tenantId,
      actorId: user._id,
      action: product.isActive
        ? "product.deactivated"
        : "product.activated",
      resource: "products",
      resourceId: args.productId,
    });
  },
});
