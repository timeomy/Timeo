import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import {
  sessionTypeValidator,
  exerciseEntryValidator,
  bodyMetricsValidator,
} from "./validators";

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const logs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(100);

    return await Promise.all(
      logs.map(async (log) => {
        const client = await ctx.db.get(log.clientId);
        const coach = await ctx.db.get(log.coachId);
        return {
          ...log,
          clientName: client?.name ?? "Unknown",
          clientEmail: client?.email,
          coachName: coach?.name ?? "Unknown",
        };
      })
    );
  },
});

export const listByClient = query({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const targetClientId = args.clientId ?? user._id;

    // If viewing another user's logs, require staff+ role
    if (targetClientId !== user._id) {
      await requireRole(ctx, args.tenantId, ["admin", "staff"]);
    }

    const logs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_tenant_client", (q) =>
        q.eq("tenantId", args.tenantId).eq("clientId", targetClientId)
      )
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        const coach = await ctx.db.get(log.coachId);
        return {
          ...log,
          coachName: coach?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getById = query({
  args: { sessionLogId: v.id("sessionLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.sessionLogId);
    if (!log) throw new Error("Session log not found");

    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, log.tenantId);

    // Allow client or staff+ to view
    if (log.clientId !== user._id) {
      await requireRole(ctx, log.tenantId, ["admin", "staff"]);
    }

    const client = await ctx.db.get(log.clientId);
    const coach = await ctx.db.get(log.coachId);
    const booking = log.bookingId ? await ctx.db.get(log.bookingId) : null;

    return {
      ...log,
      clientName: client?.name ?? "Unknown",
      clientEmail: client?.email,
      coachName: coach?.name ?? "Unknown",
      bookingDetails: booking
        ? { startTime: booking.startTime, endTime: booking.endTime }
        : null,
    };
  },
});

export const getClientProgress = query({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const logs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_tenant_client", (q) =>
        q.eq("tenantId", args.tenantId).eq("clientId", args.clientId)
      )
      .order("asc")
      .collect();

    // Extract metrics over time for progress tracking
    const metricsHistory = logs
      .filter((l) => l.metrics)
      .map((l) => ({
        date: l.createdAt,
        metrics: l.metrics!,
      }));

    // Get credit balance
    const credits = await ctx.db
      .query("sessionCredits")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.clientId)
      )
      .collect();

    const totalRemaining = credits.reduce(
      (sum, c) => sum + (c.totalSessions - c.usedSessions),
      0
    );

    return {
      totalSessions: logs.length,
      byType: {
        personal_training: logs.filter((l) => l.sessionType === "personal_training").length,
        group_class: logs.filter((l) => l.sessionType === "group_class").length,
        assessment: logs.filter((l) => l.sessionType === "assessment").length,
        consultation: logs.filter((l) => l.sessionType === "consultation").length,
      },
      metricsHistory,
      creditsRemaining: totalRemaining,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.id("users"),
    bookingId: v.optional(v.id("bookings")),
    creditId: v.optional(v.id("sessionCredits")),
    sessionType: sessionTypeValidator,
    notes: v.optional(v.string()),
    exercises: v.array(exerciseEntryValidator),
    metrics: v.optional(bodyMetricsValidator),
  },
  handler: async (ctx, args) => {
    const { user: coach } = await requireRole(ctx, args.tenantId, [
      "admin",
      "staff",
    ]);

    const now = Date.now();

    const logId = await ctx.db.insert("sessionLogs", {
      tenantId: args.tenantId,
      clientId: args.clientId,
      coachId: coach._id,
      bookingId: args.bookingId,
      creditId: args.creditId,
      sessionType: args.sessionType,
      notes: args.notes,
      exercises: args.exercises,
      metrics: args.metrics,
      createdAt: now,
      updatedAt: now,
    });

    // If using session credits, consume one
    if (args.creditId) {
      const credit = await ctx.db.get(args.creditId);
      if (credit && credit.usedSessions < credit.totalSessions) {
        await ctx.db.patch(args.creditId, {
          usedSessions: credit.usedSessions + 1,
        });

        // Check if credits are running low (<=2 remaining)
        const remaining = credit.totalSessions - (credit.usedSessions + 1);
        if (remaining <= 2 && remaining >= 0) {
          await ctx.db.insert("notifications", {
            userId: args.clientId,
            tenantId: args.tenantId,
            type: "credits_low",
            title: "Sessions Running Low",
            body: `You have ${remaining} session${remaining !== 1 ? "s" : ""} remaining. Consider purchasing more!`,
            read: false,
            createdAt: now,
          });
        }
      }
    }

    // Notify client about session log
    const client = await ctx.db.get(args.clientId);
    await ctx.db.insert("notifications", {
      userId: args.clientId,
      tenantId: args.tenantId,
      type: "session_logged",
      title: "Session Logged",
      body: `Coach ${coach.name} logged your ${args.sessionType.replace(/_/g, " ")} session.`,
      data: { sessionLogId: logId },
      read: false,
      createdAt: now,
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: coach._id,
      action: "session_log.created",
      resource: "sessionLogs",
      resourceId: logId,
    });

    return logId;
  },
});

export const update = mutation({
  args: {
    sessionLogId: v.id("sessionLogs"),
    notes: v.optional(v.string()),
    exercises: v.optional(v.array(exerciseEntryValidator)),
    metrics: v.optional(bodyMetricsValidator),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.sessionLogId);
    if (!log) throw new Error("Session log not found");

    const { user } = await requireRole(ctx, log.tenantId, ["admin", "staff"]);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.exercises !== undefined) updates.exercises = args.exercises;
    if (args.metrics !== undefined) updates.metrics = args.metrics;

    await ctx.db.patch(args.sessionLogId, updates);

    await insertAuditLog(ctx, {
      tenantId: log.tenantId,
      actorId: user._id,
      action: "session_log.updated",
      resource: "sessionLogs",
      resourceId: args.sessionLogId,
    });
  },
});

export const remove = mutation({
  args: { sessionLogId: v.id("sessionLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.sessionLogId);
    if (!log) throw new Error("Session log not found");

    const { user } = await requireRole(ctx, log.tenantId, ["admin"]);

    // If a credit was consumed, refund it
    if (log.creditId) {
      const credit = await ctx.db.get(log.creditId);
      if (credit && credit.usedSessions > 0) {
        await ctx.db.patch(log.creditId, {
          usedSessions: credit.usedSessions - 1,
        });
      }
    }

    await ctx.db.delete(args.sessionLogId);

    await insertAuditLog(ctx, {
      tenantId: log.tenantId,
      actorId: user._id,
      action: "session_log.deleted",
      resource: "sessionLogs",
      resourceId: args.sessionLogId,
    });
  },
});
