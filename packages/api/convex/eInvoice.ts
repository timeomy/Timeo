import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/middleware";
import { insertAuditLog } from "./lib/helpers";

const buyerIdTypeValidator = v.union(
  v.literal("nric"),
  v.literal("passport"),
  v.literal("brn"),
  v.literal("army")
);

const buyerAddressValidator = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postcode: v.string(),
  country: v.string(),
});

// ─── Public Queries (no auth — customer scans QR) ──────────────────

/**
 * Look up a receipt by receipt number + tenant slug.
 * No auth required — this is the public e-invoice form.
 */
export const lookupReceipt = query({
  args: {
    tenantSlug: v.string(),
    receiptNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .unique();
    if (!tenant) return null;

    const transaction = await ctx.db
      .query("posTransactions")
      .withIndex("by_receipt", (q) => q.eq("receiptNumber", args.receiptNumber))
      .first();

    if (!transaction || transaction.tenantId !== tenant._id) return null;

    // Check if already submitted
    const existing = await ctx.db
      .query("eInvoiceRequests")
      .withIndex("by_transaction", (q) =>
        q.eq("transactionId", transaction._id)
      )
      .first();

    return {
      found: true,
      receiptNumber: transaction.receiptNumber,
      date: transaction.createdAt,
      items: transaction.items,
      subtotal: transaction.subtotal,
      discount: transaction.discount,
      total: transaction.total,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      tenantName: tenant.name,
      tenantId: tenant._id,
      transactionId: transaction._id,
      alreadySubmitted: !!existing,
      existingStatus: existing?.status ?? null,
    };
  },
});

/**
 * Submit an e-invoice request (no auth — public form).
 */
export const submitRequest = mutation({
  args: {
    tenantSlug: v.string(),
    receiptNumber: v.string(),
    buyerTin: v.string(),
    buyerIdType: buyerIdTypeValidator,
    buyerIdValue: v.string(),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerPhone: v.optional(v.string()),
    buyerAddress: buyerAddressValidator,
    buyerSstRegNo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .unique();
    if (!tenant) throw new Error("Business not found");

    const transaction = await ctx.db
      .query("posTransactions")
      .withIndex("by_receipt", (q) => q.eq("receiptNumber", args.receiptNumber))
      .first();
    if (!transaction || transaction.tenantId !== tenant._id) {
      throw new Error("Receipt not found");
    }

    // Check for duplicate
    const existing = await ctx.db
      .query("eInvoiceRequests")
      .withIndex("by_transaction", (q) =>
        q.eq("transactionId", transaction._id)
      )
      .first();
    if (existing) {
      throw new Error("e-Invoice request already submitted for this receipt");
    }

    const requestId = await ctx.db.insert("eInvoiceRequests", {
      tenantId: tenant._id,
      transactionId: transaction._id,
      receiptNumber: args.receiptNumber,
      buyerTin: args.buyerTin,
      buyerIdType: args.buyerIdType,
      buyerIdValue: args.buyerIdValue,
      buyerName: args.buyerName,
      buyerEmail: args.buyerEmail,
      buyerPhone: args.buyerPhone,
      buyerAddress: args.buyerAddress,
      buyerSstRegNo: args.buyerSstRegNo,
      status: "pending",
      createdAt: Date.now(),
    });

    return requestId;
  },
});

// ─── Taxpayer Profile (Seller/Supplier) ─────────────────────────────

const taxpayerIdTypeValidator = v.union(
  v.literal("brn"),
  v.literal("nric"),
  v.literal("passport"),
  v.literal("army")
);

const taxpayerAddressValidator = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  line3: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postcode: v.string(),
  country: v.string(),
});

export const getTaxpayerProfile = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);
    const tenant = await ctx.db.get(args.tenantId);
    return tenant?.eInvoiceProfile ?? null;
  },
});

export const saveTaxpayerProfile = mutation({
  args: {
    tenantId: v.id("tenants"),
    taxpayerName: v.string(),
    tin: v.string(),
    msicCode: v.string(),
    msicDescription: v.optional(v.string()),
    idType: taxpayerIdTypeValidator,
    idNumber: v.string(),
    sstRegNo: v.optional(v.string()),
    tourismRegNo: v.optional(v.string()),
    address: taxpayerAddressValidator,
    notificationEmail: v.string(),
    notificationPhone: v.string(),
    lhdnClientId: v.optional(v.string()),
    lhdnClientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.tenantId, ["admin"]);

    await ctx.db.patch(args.tenantId, {
      eInvoiceProfile: {
        taxpayerName: args.taxpayerName,
        tin: args.tin,
        msicCode: args.msicCode,
        msicDescription: args.msicDescription,
        idType: args.idType,
        idNumber: args.idNumber,
        sstRegNo: args.sstRegNo,
        tourismRegNo: args.tourismRegNo,
        address: args.address,
        notificationEmail: args.notificationEmail,
        notificationPhone: args.notificationPhone,
        lhdnClientId: args.lhdnClientId,
        lhdnClientSecret: args.lhdnClientSecret,
      },
    });

    await insertAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "einvoice.profile_updated",
      resource: "tenants",
      resourceId: args.tenantId,
      metadata: { taxpayerName: args.taxpayerName, tin: args.tin },
    });
  },
});

// ─── Admin Queries & Mutations ─────────────────────────────────────

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("submitted"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.tenantId, ["admin"]);

    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("eInvoiceRequests")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      requests = await ctx.db
        .query("eInvoiceRequests")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .collect();
    }

    return requests;
  },
});

export const markSubmitted = mutation({
  args: {
    requestId: v.id("eInvoiceRequests"),
    lhdnSubmissionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    const { user } = await requireRole(ctx, request.tenantId, ["admin"]);

    await ctx.db.patch(args.requestId, {
      status: "submitted",
      submittedAt: Date.now(),
      lhdnSubmissionId: args.lhdnSubmissionId,
    });

    await insertAuditLog(ctx, {
      tenantId: request.tenantId,
      actorId: user._id,
      action: "einvoice.submitted",
      resource: "eInvoiceRequests",
      resourceId: args.requestId,
      metadata: {
        receiptNumber: request.receiptNumber,
        lhdnSubmissionId: args.lhdnSubmissionId,
      },
    });
  },
});

export const revertToPending = mutation({
  args: {
    requestId: v.id("eInvoiceRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    const { user } = await requireRole(ctx, request.tenantId, ["admin"]);

    await ctx.db.patch(args.requestId, {
      status: "pending",
      submittedAt: undefined,
      lhdnSubmissionId: undefined,
      rejectionReason: undefined,
    });

    await insertAuditLog(ctx, {
      tenantId: request.tenantId,
      actorId: user._id,
      action: "einvoice.reverted",
      resource: "eInvoiceRequests",
      resourceId: args.requestId,
      metadata: {
        receiptNumber: request.receiptNumber,
        previousStatus: request.status,
      },
    });
  },
});

export const markRejected = mutation({
  args: {
    requestId: v.id("eInvoiceRequests"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    const { user } = await requireRole(ctx, request.tenantId, ["admin"]);

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.reason,
    });

    await insertAuditLog(ctx, {
      tenantId: request.tenantId,
      actorId: user._id,
      action: "einvoice.rejected",
      resource: "eInvoiceRequests",
      resourceId: args.requestId,
      metadata: {
        receiptNumber: request.receiptNumber,
        reason: args.reason,
      },
    });
  },
});
