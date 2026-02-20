import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

// ─── Queries ──────────────────────────────────────────────────────────────

export const getByUser = query({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const targetUserId = args.userId ?? user._id;

    if (targetUserId !== user._id) {
      await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    }

    const credits = await ctx.db
      .query("sessionCredits")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", targetUserId)
      )
      .collect();

    return await Promise.all(
      credits.map(async (c) => {
        const pkg = await ctx.db.get(c.packageId);
        return {
          ...c,
          packageName: pkg?.name ?? "Unknown",
          remaining: c.totalSessions - c.usedSessions,
        };
      })
    );
  },
});

export const getBalance = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const credits = await ctx.db
      .query("sessionCredits")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", user._id)
      )
      .collect();

    const now = Date.now();
    const activeCredits = credits.filter(
      (c) =>
        c.usedSessions < c.totalSessions &&
        (!c.expiresAt || c.expiresAt > now)
    );

    return {
      totalRemaining: activeCredits.reduce(
        (sum, c) => sum + (c.totalSessions - c.usedSessions),
        0
      ),
      packages: activeCredits.length,
    };
  },
});

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const credits = await ctx.db
      .query("sessionCredits")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(200);

    return await Promise.all(
      credits.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        const pkg = await ctx.db.get(c.packageId);
        return {
          ...c,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email,
          packageName: pkg?.name ?? "Unknown",
          remaining: c.totalSessions - c.usedSessions,
        };
      })
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const purchase = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    packageId: v.id("sessionPackages"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user: actor } = await requireRole(ctx, args.tenantId, [
      "admin",
      "staff",
    ]);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || pkg.tenantId !== args.tenantId) {
      throw new Error("Session package not found");
    }
    if (!pkg.isActive) {
      throw new Error("Session package is no longer available");
    }

    const creditId = await ctx.db.insert("sessionCredits", {
      tenantId: args.tenantId,
      userId: args.userId,
      packageId: args.packageId,
      totalSessions: pkg.sessionCount,
      usedSessions: 0,
      expiresAt: args.expiresAt,
      purchasedAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: actor._id,
      action: "session_credits.purchased",
      resource: "sessionCredits",
      resourceId: creditId,
      metadata: {
        packageName: pkg.name,
        sessions: pkg.sessionCount,
        userId: args.userId,
      },
    });

    return creditId;
  },
});

export const consume = mutation({
  args: { creditId: v.id("sessionCredits") },
  handler: async (ctx, args) => {
    const credit = await ctx.db.get(args.creditId);
    if (!credit) throw new Error("Session credit not found");

    await requireRole(ctx, credit.tenantId, ["admin", "staff"]);

    if (credit.usedSessions >= credit.totalSessions) {
      throw new Error("No sessions remaining");
    }
    if (credit.expiresAt && credit.expiresAt < Date.now()) {
      throw new Error("Session credits have expired");
    }

    await ctx.db.patch(args.creditId, {
      usedSessions: credit.usedSessions + 1,
    });

    const remaining = credit.totalSessions - (credit.usedSessions + 1);

    // Notify if credits are low
    if (remaining <= 2 && remaining >= 0) {
      await ctx.db.insert("notifications", {
        userId: credit.userId,
        tenantId: credit.tenantId,
        type: "credits_low",
        title: "Sessions Running Low",
        body: `You have ${remaining} session${remaining !== 1 ? "s" : ""} remaining.`,
        read: false,
        createdAt: Date.now(),
      });
    }

    return { remaining };
  },
});

export const refund = mutation({
  args: {
    creditId: v.id("sessionCredits"),
    sessions: v.number(),
  },
  handler: async (ctx, args) => {
    const credit = await ctx.db.get(args.creditId);
    if (!credit) throw new Error("Session credit not found");

    const { user } = await requireRole(ctx, credit.tenantId, ["admin"]);

    if (args.sessions > credit.usedSessions) {
      throw new Error("Cannot refund more sessions than used");
    }

    await ctx.db.patch(args.creditId, {
      usedSessions: credit.usedSessions - args.sessions,
    });

    await insertAuditLog(ctx, {
      tenantId: credit.tenantId,
      actorId: user._id,
      action: "session_credits.refunded",
      resource: "sessionCredits",
      resourceId: args.creditId,
      metadata: { sessionsRefunded: args.sessions },
    });
  },
});
