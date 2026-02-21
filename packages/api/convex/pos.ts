import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authenticateUser,
  requireRole,
  requireTenantAccess,
} from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";
import { posPaymentMethodValidator, posItemTypeValidator } from "./validators";

// ─── Queries ──────────────────────────────────────────────────────────────

export const listTransactions = query({
  args: {
    tenantId: v.id("tenants"),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    let transactions;
    if (args.date) {
      const dayStart = args.date;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      transactions = await ctx.db
        .query("posTransactions")
        .withIndex("by_tenant_date", (q) =>
          q
            .eq("tenantId", args.tenantId)
            .gte("createdAt", dayStart)
            .lt("createdAt", dayEnd)
        )
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db
        .query("posTransactions")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .take(100);
    }

    return await Promise.all(
      transactions.map(async (t) => {
        const customer = await ctx.db.get(t.customerId);
        const staff = await ctx.db.get(t.staffId);
        return {
          ...t,
          customerName: customer?.name ?? "Unknown",
          customerEmail: customer?.email,
          staffName: staff?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getDailySummary = query({
  args: {
    tenantId: v.id("tenants"),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const now = Date.now();
    const todayStart = args.date ?? new Date(now).setHours(0, 0, 0, 0);
    const dayEnd = todayStart + 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("posTransactions")
      .withIndex("by_tenant_date", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("createdAt", todayStart)
          .lt("createdAt", dayEnd)
      )
      .collect();

    const completed = transactions.filter((t) => t.status === "completed");
    const voided = transactions.filter((t) => t.status === "voided");

    const byPaymentMethod = {
      cash: 0,
      card: 0,
      qr_pay: 0,
      bank_transfer: 0,
    };

    for (const t of completed) {
      byPaymentMethod[t.paymentMethod] += t.total;
    }

    return {
      totalTransactions: completed.length,
      totalRevenue: completed.reduce((sum, t) => sum + t.total, 0),
      totalDiscount: completed.reduce((sum, t) => sum + t.discount, 0),
      voidedCount: voided.length,
      byPaymentMethod,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const createTransaction = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("users"),
    items: v.array(
      v.object({
        type: posItemTypeValidator,
        referenceId: v.string(),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    paymentMethod: posPaymentMethodValidator,
    voucherId: v.optional(v.id("vouchers")),
    discount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: staff } = await requireRole(ctx, args.tenantId, [
      "admin",
      "staff",
    ]);

    if (args.items.length === 0) {
      throw new Error("Transaction must have at least one item");
    }

    const subtotal = args.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = args.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    // Generate receipt number: RCPT-{tenant short}-{timestamp}-{random}
    const tenant = await ctx.db.get(args.tenantId);
    const prefix = (tenant?.slug ?? "TM").substring(0, 4).toUpperCase();
    const receiptNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const transactionId = await ctx.db.insert("posTransactions", {
      tenantId: args.tenantId,
      customerId: args.customerId,
      staffId: staff._id,
      items: args.items,
      subtotal,
      discount,
      total,
      currency: "MYR",
      paymentMethod: args.paymentMethod,
      voucherId: args.voucherId,
      status: "completed",
      receiptNumber,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Process items: create session credits for session packages, memberships etc.
    for (const item of args.items) {
      if (item.type === "session_package") {
        // Look up the package and create credits
        const pkg = await ctx.db
          .query("sessionPackages")
          .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
          .filter((q) => q.eq(q.field("_id"), item.referenceId as any))
          .first();

        if (pkg) {
          await ctx.db.insert("sessionCredits", {
            tenantId: args.tenantId,
            userId: args.customerId,
            packageId: pkg._id,
            totalSessions: pkg.sessionCount * item.quantity,
            usedSessions: 0,
            purchasedAt: Date.now(),
          });
        }
      }
    }

    // Send receipt notification
    await ctx.db.insert("notifications", {
      userId: args.customerId,
      tenantId: args.tenantId,
      type: "receipt",
      title: "Payment Receipt",
      body: `Receipt #${receiptNumber} — RM ${(total / 100).toFixed(2)}`,
      data: { transactionId, receiptNumber },
      read: false,
      createdAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: staff._id,
      action: "pos.transaction_created",
      resource: "posTransactions",
      resourceId: transactionId,
      metadata: {
        receiptNumber,
        total,
        paymentMethod: args.paymentMethod,
        itemCount: args.items.length,
      },
    });

    return { transactionId, receiptNumber };
  },
});

export const voidTransaction = mutation({
  args: {
    transactionId: v.id("posTransactions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found");

    // Staff and admin can void transactions
    const { user } = await requireRole(ctx, transaction.tenantId, ["admin", "staff"]);

    if (transaction.status !== "completed") {
      throw new Error("Only completed transactions can be voided");
    }

    await ctx.db.patch(args.transactionId, { status: "voided" });

    await insertAuditLog(ctx, {
      tenantId: transaction.tenantId,
      actorId: user._id,
      action: "pos.transaction_voided",
      resource: "posTransactions",
      resourceId: args.transactionId,
      metadata: { reason: args.reason, receiptNumber: transaction.receiptNumber },
    });
  },
});

export const deleteTransaction = mutation({
  args: {
    transactionId: v.id("posTransactions"),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found");

    // Only admin can permanently delete transactions
    const { user } = await requireRole(ctx, transaction.tenantId, ["admin"]);

    await ctx.db.delete(args.transactionId);

    await insertAuditLog(ctx, {
      tenantId: transaction.tenantId,
      actorId: user._id,
      action: "pos.transaction_deleted",
      resource: "posTransactions",
      resourceId: args.transactionId,
      metadata: {
        receiptNumber: transaction.receiptNumber,
        total: transaction.total,
      },
    });
  },
});

export const listByCustomer = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);

    const transactions = await ctx.db
      .query("posTransactions")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .collect();

    // Filter to the current tenant
    const tenantTransactions = transactions.filter(
      (t) => t.tenantId === args.tenantId
    );

    return await Promise.all(
      tenantTransactions.map(async (t) => {
        const staff = await ctx.db.get(t.staffId);
        const tenant = await ctx.db.get(t.tenantId);
        return {
          ...t,
          staffName: staff?.name ?? "Unknown",
          tenantName: tenant?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getMonthlyStatement = query({
  args: {
    tenantId: v.id("tenants"),
    year: v.number(),
    month: v.number(), // 0-11
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin", "staff"]);

    const startDate = new Date(args.year, args.month, 1).getTime();
    const endDate = new Date(args.year, args.month + 1, 1).getTime();

    const transactions = await ctx.db
      .query("posTransactions")
      .withIndex("by_tenant_date", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("createdAt", startDate)
          .lt("createdAt", endDate)
      )
      .order("desc")
      .collect();

    const completed = transactions.filter((t) => t.status === "completed");
    const voided = transactions.filter((t) => t.status === "voided");

    const byPaymentMethod = { cash: 0, card: 0, qr_pay: 0, bank_transfer: 0 };
    const byItemType = { membership: 0, session_package: 0, service: 0, product: 0 };

    for (const t of completed) {
      byPaymentMethod[t.paymentMethod] += t.total;
      for (const item of t.items) {
        byItemType[item.type as keyof typeof byItemType] += item.price * item.quantity;
      }
    }

    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const customer = await ctx.db.get(t.customerId);
        const staff = await ctx.db.get(t.staffId);
        return {
          ...t,
          customerName: customer?.name ?? "Unknown",
          staffName: staff?.name ?? "Unknown",
        };
      })
    );

    return {
      period: { year: args.year, month: args.month },
      totalTransactions: completed.length,
      totalRevenue: completed.reduce((sum, t) => sum + t.total, 0),
      totalDiscount: completed.reduce((sum, t) => sum + t.discount, 0),
      voidedCount: voided.length,
      voidedTotal: voided.reduce((sum, t) => sum + t.total, 0),
      byPaymentMethod,
      byItemType,
      transactions: enriched,
    };
  },
});

export const getReceipt = query({
  args: { transactionId: v.id("posTransactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found");

    await requireTenantAccess(ctx, transaction.tenantId);

    const customer = await ctx.db.get(transaction.customerId);
    const staff = await ctx.db.get(transaction.staffId);
    const tenant = await ctx.db.get(transaction.tenantId);
    const voucher = transaction.voucherId
      ? await ctx.db.get(transaction.voucherId)
      : null;

    return {
      ...transaction,
      customerName: customer?.name ?? "Unknown",
      customerEmail: customer?.email,
      staffName: staff?.name ?? "Unknown",
      tenantName: tenant?.name ?? "Unknown",
      tenantLogo: tenant?.branding?.logoUrl,
      voucherCode: voucher?.code,
    };
  },
});
