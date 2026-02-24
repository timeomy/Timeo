import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { checkInMethodValidator } from "./validators";
import { internal } from "./_generated/api";

// ─── Internal helpers ─────────────────────────────────────────────────────

/** Returns door camera config for a tenant — callable from Node.js actions. */
export const getTenantCameraConfig = internalQuery({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;
    return tenant.settings?.doorCamera ?? null;
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    let checkIns;
    if (args.date) {
      const dayStart = args.date;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      checkIns = await ctx.db
        .query("checkIns")
        .withIndex("by_tenant_date", (q) =>
          q.eq("tenantId", args.tenantId).gte("timestamp", dayStart).lt("timestamp", dayEnd)
        )
        .order("desc")
        .collect();
    } else {
      checkIns = await ctx.db
        .query("checkIns")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .take(100);
    }

    return await Promise.all(
      checkIns.map(async (ci) => {
        const user = await ctx.db.get(ci.userId);
        const checkedInByUser = ci.checkedInBy
          ? await ctx.db.get(ci.checkedInBy)
          : null;
        return {
          ...ci,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email,
          checkedInByName: checkedInByUser?.name,
        };
      })
    );
  },
});

export const listByUser = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return checkIns.filter((ci) => ci.tenantId === args.tenantId);
  },
});

export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const todayCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).gte("timestamp", todayMs)
      )
      .collect();

    const weekStart = todayMs - new Date(now).getDay() * 24 * 60 * 60 * 1000;
    const weekCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).gte("timestamp", weekStart)
      )
      .collect();

    return {
      today: todayCheckIns.length,
      thisWeek: weekCheckIns.length,
      byMethod: {
        qr: todayCheckIns.filter((c) => c.method === "qr").length,
        nfc: todayCheckIns.filter((c) => c.method === "nfc").length,
        manual: todayCheckIns.filter((c) => c.method === "manual").length,
      },
    };
  },
});

export const getMyQrCode = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    return await ctx.db
      .query("memberQrCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const checkIn = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    method: checkInMethodValidator,
  },
  handler: async (ctx, args) => {
    const staffUser = await authenticateUser(ctx);
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    // Look up QR code
    const qrCode = await ctx.db
      .query("memberQrCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!qrCode || !qrCode.isActive || qrCode.tenantId !== args.tenantId) {
      throw new Error("Invalid or expired QR code");
    }

    if (qrCode.expiresAt && qrCode.expiresAt < Date.now()) {
      throw new Error("QR code has expired");
    }

    const checkInId = await ctx.db.insert("checkIns", {
      tenantId: args.tenantId,
      userId: qrCode.userId,
      method: args.method,
      checkedInBy: staffUser._id,
      timestamp: Date.now(),
    });

    // Send check-in notification to member
    await ctx.db.insert("notifications", {
      userId: qrCode.userId,
      tenantId: args.tenantId,
      type: "check_in",
      title: "Checked In",
      body: "You've been checked in successfully. Enjoy your workout!",
      read: false,
      createdAt: Date.now(),
    });

    return checkInId;
  },
});

export const manualCheckIn = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const staffUser = await authenticateUser(ctx);
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    // Verify user is a member of this tenant
    const membership = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .unique();

    if (!membership || membership.status !== "active") {
      throw new Error("User is not an active member of this tenant");
    }

    const checkInId = await ctx.db.insert("checkIns", {
      tenantId: args.tenantId,
      userId: args.userId,
      method: "manual",
      checkedInBy: staffUser._id,
      timestamp: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      tenantId: args.tenantId,
      type: "check_in",
      title: "Checked In",
      body: "You've been checked in by staff. Enjoy your workout!",
      read: false,
      createdAt: Date.now(),
    });

    return checkInId;
  },
});

export const generateQrCode = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, args.tenantId);

    // Deactivate existing QR codes for this user+tenant
    const existing = await ctx.db
      .query("memberQrCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const qr of existing) {
      if (qr.tenantId === args.tenantId && qr.isActive) {
        await ctx.db.patch(qr._id, { isActive: false });
      }
    }

    // Generate a unique code (UUID-like)
    const code = [
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 8),
      user._id.substring(0, 8),
    ].join("-");

    const qrId = await ctx.db.insert("memberQrCodes", {
      tenantId: args.tenantId,
      userId: user._id,
      code,
      isActive: true,
      createdAt: Date.now(),
    });

    return { qrId, code };
  },
});

/**
 * Called by the Convex HTTP door webhook (no auth token required).
 * Accepts a tenant slug (from the URL) so the HTTP handler doesn't need
 * to do a separate tenant lookup.
 *
 * Validates the QR code, verifies membership, records the check-in,
 * and returns whether the door should open.
 */
export const processQrDoorScanBySlug = internalMutation({
  args: {
    code: v.string(),
    tenantSlug: v.string(),
    deviceSn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Look up tenant by slug
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .unique();

    if (!tenant) {
      return { allowed: false, reason: "Tenant not found" };
    }

    // Optional: verify the push is coming from the configured camera
    const cameraConfig = tenant.settings?.doorCamera;
    if (cameraConfig?.deviceSn && args.deviceSn && cameraConfig.deviceSn !== args.deviceSn) {
      return { allowed: false, reason: "Device serial number mismatch" };
    }

    const tenantId = tenant._id;

    // Validate QR code
    const qrCode = await ctx.db
      .query("memberQrCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!qrCode || !qrCode.isActive || qrCode.tenantId !== tenantId) {
      return { allowed: false, reason: "Invalid or unrecognised QR code" };
    }

    if (qrCode.expiresAt && qrCode.expiresAt < Date.now()) {
      return { allowed: false, reason: "QR code has expired" };
    }

    // Verify the member is still active in this tenant
    const membership = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", qrCode.userId)
      )
      .unique();

    if (!membership || membership.status !== "active") {
      return { allowed: false, reason: "Membership not active" };
    }

    const member = await ctx.db.get(qrCode.userId);

    // Record the check-in
    await ctx.db.insert("checkIns", {
      tenantId,
      userId: qrCode.userId,
      method: "qr",
      timestamp: Date.now(),
    });

    // Notify the member
    await ctx.db.insert("notifications", {
      userId: qrCode.userId,
      tenantId,
      type: "check_in",
      title: "Checked In",
      body: "Welcome! Door access granted. Enjoy your workout.",
      read: false,
      createdAt: Date.now(),
    });

    return {
      allowed: true,
      memberId: qrCode.userId as string,
      memberName: member?.name ?? "Member",
      gpioPort: cameraConfig?.gpioPort,
    };
  },
});

export const revokeQrCode = mutation({
  args: { qrCodeId: v.id("memberQrCodes") },
  handler: async (ctx, args) => {
    const qrCode = await ctx.db.get(args.qrCodeId);
    if (!qrCode) throw new Error("QR code not found");

    const user = await authenticateUser(ctx);
    await requireTenantAccess(ctx, qrCode.tenantId);

    // Only the owner or admin/staff can revoke
    if (qrCode.userId !== user._id) {
      await requireRole(ctx, qrCode.tenantId, ["admin", "staff"]);
    }

    await ctx.db.patch(args.qrCodeId, { isActive: false });
  },
});
