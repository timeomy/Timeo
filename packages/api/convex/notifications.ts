import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { authenticateUser, requireTenantAccess } from "./lib/middleware";
import { notificationTypeValidator, pushPlatformValidator } from "./validators";

// ── Queries ──────────────────────────────────────────────────────────────

export const listByUser = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    const limit = args.limit ?? 20;

    let q = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    const notifications = await q.take(limit + 1);
    const hasMore = notifications.length > limit;
    const page = hasMore ? notifications.slice(0, limit) : notifications;

    return {
      notifications: page,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?._id : undefined,
    };
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authenticateUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

export const getPreferences = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", user._id).eq("tenantId", args.tenantId)
      )
      .unique();

    if (!prefs) {
      return {
        emailBookingConfirm: true,
        emailBookingReminder: true,
        emailOrderUpdate: true,
        pushEnabled: true,
        inAppEnabled: true,
      };
    }

    return {
      emailBookingConfirm: prefs.emailBookingConfirm,
      emailBookingReminder: prefs.emailBookingReminder,
      emailOrderUpdate: prefs.emailOrderUpdate,
      pushEnabled: prefs.pushEnabled,
      inAppEnabled: prefs.inAppEnabled,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authenticateUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return { marked: unread.length };
  },
});

export const updatePreferences = mutation({
  args: {
    tenantId: v.id("tenants"),
    emailBookingConfirm: v.optional(v.boolean()),
    emailBookingReminder: v.optional(v.boolean()),
    emailOrderUpdate: v.optional(v.boolean()),
    pushEnabled: v.optional(v.boolean()),
    inAppEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", user._id).eq("tenantId", args.tenantId)
      )
      .unique();

    const defaults = {
      emailBookingConfirm: true,
      emailBookingReminder: true,
      emailOrderUpdate: true,
      pushEnabled: true,
      inAppEnabled: true,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        emailBookingConfirm:
          args.emailBookingConfirm ?? existing.emailBookingConfirm,
        emailBookingReminder:
          args.emailBookingReminder ?? existing.emailBookingReminder,
        emailOrderUpdate:
          args.emailOrderUpdate ?? existing.emailOrderUpdate,
        pushEnabled: args.pushEnabled ?? existing.pushEnabled,
        inAppEnabled: args.inAppEnabled ?? existing.inAppEnabled,
      });
    } else {
      await ctx.db.insert("notificationPreferences", {
        userId: user._id,
        tenantId: args.tenantId,
        emailBookingConfirm:
          args.emailBookingConfirm ?? defaults.emailBookingConfirm,
        emailBookingReminder:
          args.emailBookingReminder ?? defaults.emailBookingReminder,
        emailOrderUpdate:
          args.emailOrderUpdate ?? defaults.emailOrderUpdate,
        pushEnabled: args.pushEnabled ?? defaults.pushEnabled,
        inAppEnabled: args.inAppEnabled ?? defaults.inAppEnabled,
      });
    }
  },
});

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: pushPlatformValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (existing) {
      if (existing.userId !== user._id) {
        await ctx.db.patch(existing._id, {
          userId: user._id,
          platform: args.platform,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("pushTokens", {
      userId: user._id,
      token: args.token,
      platform: args.platform,
      createdAt: Date.now(),
    });
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// ── Internal mutations (called by actions) ───────────────────────────────

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if user wants in-app notifications
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .unique();

    // Default to enabled if no preferences set
    if (prefs && !prefs.inAppEnabled) {
      return null;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      tenantId: args.tenantId,
      type: args.type,
      title: args.title,
      body: args.body,
      data: args.data,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const getUserPreferences = internalQuery({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .unique();

    return (
      prefs ?? {
        emailBookingConfirm: true,
        emailBookingReminder: true,
        emailOrderUpdate: true,
        pushEnabled: true,
        inAppEnabled: true,
      }
    );
  },
});

export const getUserPushTokens = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getUpcomingBookingsForReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;

    // Get bookings starting in the next hour
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "confirmed"),
          q.gte(q.field("startTime"), now),
          q.lte(q.field("startTime"), oneHourFromNow)
        )
      )
      .collect();

    // Filter out ones that already have a reminder notification
    const result = [];
    for (const booking of bookings) {
      const existingReminder = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", booking.customerId))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "booking_reminder"),
            q.eq(q.field("data.bookingId"), booking._id)
          )
        )
        .first();

      if (!existingReminder) {
        const service = await ctx.db.get(booking.serviceId);
        const tenant = await ctx.db.get(booking.tenantId);
        const customer = await ctx.db.get(booking.customerId);
        const staff = booking.staffId
          ? await ctx.db.get(booking.staffId)
          : null;

        result.push({
          ...booking,
          serviceName: service?.name ?? "Unknown",
          tenantName: tenant?.name ?? "Unknown",
          customerName: customer?.name ?? "Unknown",
          customerEmail: customer?.email ?? "",
          staffName: staff?.name,
        });
      }
    }

    return result;
  },
});
