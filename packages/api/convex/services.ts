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
        .query("services")
        .withIndex("by_tenant_active", (q) =>
          q.eq("tenantId", args.tenantId).eq("isActive", true)
        )
        .collect();
    }

    return await ctx.db
      .query("services")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getById = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");
    await requireTenantAccess(ctx, service.tenantId);
    return service;
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    const now = Date.now();

    const serviceId = await ctx.db.insert("services", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      durationMinutes: args.durationMinutes,
      price: args.price,
      currency: args.currency ?? "MYR",
      isActive: true,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "service.created",
      resource: "services",
      resourceId: serviceId,
    });

    return serviceId;
  },
});

export const update = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");

    const { user } = await requireRole(ctx, service.tenantId, [
      "admin",
      "staff",
    ]);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.durationMinutes !== undefined)
      updates.durationMinutes = args.durationMinutes;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;

    await ctx.db.patch(args.serviceId, updates);

    await insertAuditLog(ctx, {
      tenantId: service.tenantId,
      actorId: user._id,
      action: "service.updated",
      resource: "services",
      resourceId: args.serviceId,
      metadata: { fields: Object.keys(updates) },
    });
  },
});

export const toggleActive = mutation({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");

    const { user } = await requireRole(ctx, service.tenantId, ["admin"]);

    await ctx.db.patch(args.serviceId, {
      isActive: !service.isActive,
      updatedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: service.tenantId,
      actorId: user._id,
      action: service.isActive
        ? "service.deactivated"
        : "service.activated",
      resource: "services",
      resourceId: args.serviceId,
    });
  },
});
