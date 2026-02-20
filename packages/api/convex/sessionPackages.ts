import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireTenantAccess } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

// ─── Queries ──────────────────────────────────────────────────────────────

export const listPublic = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionPackages")
      .withIndex("by_tenant_active", (q) =>
        q.eq("tenantId", args.tenantId).eq("isActive", true)
      )
      .collect();
  },
});

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { membership } = await requireTenantAccess(ctx, args.tenantId);

    // Customers only see active packages
    if (membership.role === "customer") {
      return await ctx.db
        .query("sessionPackages")
        .withIndex("by_tenant_active", (q) =>
          q.eq("tenantId", args.tenantId).eq("isActive", true)
        )
        .collect();
    }

    return await ctx.db
      .query("sessionPackages")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getById = query({
  args: { packageId: v.id("sessionPackages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Session package not found");
    await requireTenantAccess(ctx, pkg.tenantId);

    const service = pkg.serviceId ? await ctx.db.get(pkg.serviceId) : null;
    return {
      ...pkg,
      serviceName: service?.name,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    sessionCount: v.number(),
    price: v.number(),
    currency: v.optional(v.string()),
    serviceId: v.optional(v.id("services")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    if (args.sessionCount < 1) {
      throw new Error("Session count must be at least 1");
    }

    const packageId = await ctx.db.insert("sessionPackages", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      sessionCount: args.sessionCount,
      price: args.price,
      currency: args.currency ?? "MYR",
      serviceId: args.serviceId,
      isActive: true,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "session_package.created",
      resource: "sessionPackages",
      resourceId: packageId,
    });

    return packageId;
  },
});

export const update = mutation({
  args: {
    packageId: v.id("sessionPackages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sessionCount: v.optional(v.number()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    serviceId: v.optional(v.id("services")),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Session package not found");

    const { user } = await requireRole(ctx, pkg.tenantId, ["admin"]);

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.sessionCount !== undefined) updates.sessionCount = args.sessionCount;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.serviceId !== undefined) updates.serviceId = args.serviceId;

    await ctx.db.patch(args.packageId, updates);

    await insertAuditLog(ctx, {
      tenantId: pkg.tenantId,
      actorId: user._id,
      action: "session_package.updated",
      resource: "sessionPackages",
      resourceId: args.packageId,
    });
  },
});

export const toggleActive = mutation({
  args: { packageId: v.id("sessionPackages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Session package not found");

    const { user } = await requireRole(ctx, pkg.tenantId, ["admin"]);

    await ctx.db.patch(args.packageId, { isActive: !pkg.isActive });

    await insertAuditLog(ctx, {
      tenantId: pkg.tenantId,
      actorId: user._id,
      action: pkg.isActive
        ? "session_package.deactivated"
        : "session_package.activated",
      resource: "sessionPackages",
      resourceId: args.packageId,
    });
  },
});
