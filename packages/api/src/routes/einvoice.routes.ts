import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import {
  eInvoiceRequests,
  auditLogs,
  posTransactions,
  tenants,
} from "@timeo/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateEInvoiceSchema } from "../lib/validation.js";
import { z } from "zod";

const app = new Hono();

const EInvoiceProfileSchema = z.object({
  taxpayerName: z.string().min(1),
  tin: z.string().min(1),
  msicCode: z.string().optional(),
  msicDescription: z.string().optional(),
  idType: z.enum(["nric", "passport", "brn", "army"]).default("brn"),
  idNumber: z.string().min(1),
  sstRegNo: z.string().optional(),
  sstRate: z.number().int().min(0).max(100).optional(),
  tourismRegNo: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    line3: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default("MYS"),
  }),
  notificationEmail: z.string().email(),
  notificationPhone: z.string().min(6),
  lhdnClientId: z.string().optional(),
  lhdnClientSecret: z.string().optional(),
});

const PublicLookupSchema = z.object({
  receiptNumber: z.string().min(1),
});

const PublicCreateEInvoiceRequestSchema = z.object({
  receiptNumber: z.string().min(1),
  buyerTin: z.string().min(1),
  buyerIdType: z.enum(["nric", "passport", "brn", "army"]),
  buyerIdValue: z.string().min(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().optional(),
  buyerAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default("MY"),
  }),
  buyerSstRegNo: z.string().optional(),
});

const MarkSubmittedSchema = z.object({
  lhdnSubmissionId: z.string().optional(),
});

const MarkRejectedSchema = z.object({
  reason: z.string().min(1).max(300),
});

function mapRequestRow(
  row: typeof eInvoiceRequests.$inferSelect,
  transaction?: typeof posTransactions.$inferSelect | null,
) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderId: row.transaction_id,
    transactionId: row.transaction_id,
    invoiceNumber: row.receipt_number,
    receiptNumber: row.receipt_number,
    status: row.status,
    buyerTin: row.buyer_tin,
    buyerIdType: row.buyer_id_type,
    buyerIdValue: row.buyer_id_value,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    buyerAddress: row.buyer_address,
    buyerSstRegNo: row.buyer_sst_reg_no,
    totalAmount: transaction?.total ?? 0,
    currency: transaction?.currency ?? "MYR",
    paymentMethod: transaction?.payment_method,
    submittedAt: row.submitted_at,
    lhdnSubmissionId: row.lhdn_submission_id,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

async function getRequestWithTransaction(
  tenantId: string,
  requestId: string,
) {
  const rows = await db
    .select({ request: eInvoiceRequests, transaction: posTransactions })
    .from(eInvoiceRequests)
    .leftJoin(posTransactions, eq(eInvoiceRequests.transaction_id, posTransactions.id))
    .where(
      and(
        eq(eInvoiceRequests.id, requestId),
        eq(eInvoiceRequests.tenant_id, tenantId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

async function logAudit(input: {
  tenantId: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  resourceId?: string;
}) {
  if (!input.actorId) return;
  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    actor_role: (input.actorRole ?? "admin") as "admin",
    action: input.action,
    resource_type: "e_invoice_request",
    resource_id: input.resourceId,
  });
}

async function markRequestSubmitted(input: {
  tenantId: string;
  requestId: string;
  actorId?: string;
  actorRole?: string;
  lhdnSubmissionId?: string;
}) {
  const row = await getRequestWithTransaction(input.tenantId, input.requestId);
  if (!row) {
    return {
      ok: false as const,
      response: error("NOT_FOUND", "e-Invoice request not found"),
      status: 404,
    };
  }
  if (row.request.status !== "pending") {
    return {
      ok: false as const,
      response: error("INVALID_STATUS", "Only pending requests can be submitted"),
      status: 422,
    };
  }

  await db
    .update(eInvoiceRequests)
    .set({
      status: "submitted",
      submitted_at: new Date(),
      lhdn_submission_id: input.lhdnSubmissionId ?? row.request.lhdn_submission_id,
    })
    .where(eq(eInvoiceRequests.id, input.requestId));

  await logAudit({
    tenantId: input.tenantId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: "einvoice.submitted",
    resourceId: input.requestId,
  });

  return {
    ok: true as const,
    payload: success({ message: "e-Invoice marked as submitted" }),
  };
}

// PUBLIC: GET /tenants/:tenantId/einvoice/lookup?receiptNumber=XXX
app.get(
  "/lookup",
  zValidator("query", PublicLookupSchema),
  async (c) => {
    const tenantId = c.req.param("tenantId")!;
    const { receiptNumber } = c.req.valid("query");
    const normalizedReceipt = receiptNumber.trim().toUpperCase();

    const [transaction] = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          eq(posTransactions.receipt_number, normalizedReceipt),
        ),
      )
      .limit(1);

    if (!transaction) {
      return c.json(success({ found: false, receiptNumber: normalizedReceipt }));
    }

    const [existing] = await db
      .select()
      .from(eInvoiceRequests)
      .where(
        and(
          eq(eInvoiceRequests.tenant_id, tenantId),
          eq(eInvoiceRequests.transaction_id, transaction.id),
        ),
      )
      .limit(1);

    return c.json(
      success({
        found: true,
        alreadySubmitted: !!existing,
        existingStatus: existing?.status,
        requestId: existing?.id,
        transaction: {
          id: transaction.id,
          receiptNumber: transaction.receipt_number,
          status: transaction.status,
          date: transaction.created_at,
          items: transaction.items,
          total: transaction.total,
          currency: transaction.currency,
          paymentMethod: transaction.payment_method,
        },
      }),
    );
  },
);

// PUBLIC: POST /tenants/:tenantId/einvoice/public-request
app.post(
  "/public-request",
  zValidator("json", PublicCreateEInvoiceRequestSchema),
  async (c) => {
    const tenantId = c.req.param("tenantId")!;
    const body = c.req.valid("json");
    const normalizedReceipt = body.receiptNumber.trim().toUpperCase();

    const [transaction] = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          eq(posTransactions.receipt_number, normalizedReceipt),
        ),
      )
      .limit(1);

    if (!transaction) {
      return c.json(error("NOT_FOUND", "Receipt not found"), 404);
    }

    const [existing] = await db
      .select()
      .from(eInvoiceRequests)
      .where(
        and(
          eq(eInvoiceRequests.tenant_id, tenantId),
          eq(eInvoiceRequests.transaction_id, transaction.id),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        success({
          id: existing.id,
          alreadySubmitted: true,
          status: existing.status,
        }),
      );
    }

    const id = generateId();
    await db.insert(eInvoiceRequests).values({
      id,
      tenant_id: tenantId,
      transaction_id: transaction.id,
      receipt_number: normalizedReceipt,
      buyer_tin: body.buyerTin,
      buyer_id_type: body.buyerIdType,
      buyer_id_value: body.buyerIdValue,
      buyer_name: body.buyerName,
      buyer_email: body.buyerEmail,
      buyer_phone: body.buyerPhone ?? null,
      buyer_address: body.buyerAddress,
      buyer_sst_reg_no: body.buyerSstRegNo ?? null,
    });

    return c.json(success({ id, alreadySubmitted: false, status: "pending" }), 201);
  },
);

// GET /tenants/:tenantId/einvoice/profile
app.get(
  "/profile",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const [tenant] = await db
      .select({ eInvoiceProfile: tenants.e_invoice_profile })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return c.json(success(tenant?.eInvoiceProfile ?? null));
  },
);

// PUT /tenants/:tenantId/einvoice/profile
app.put(
  "/profile",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", EInvoiceProfileSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    await db
      .update(tenants)
      .set({ e_invoice_profile: body, updated_at: new Date() })
      .where(eq(tenants.id, tenantId));

    await db.insert(auditLogs).values({
      id: generateId(),
      tenant_id: tenantId,
      actor_id: user.id,
      actor_role: "admin",
      action: "einvoice.profile.updated",
      resource_type: "tenant",
      resource_id: tenantId,
    });

    return c.json(success({ profileId: tenantId }));
  },
);

// GET /tenants/:tenantId/einvoice
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const status = c.req.query("status");

    const rows = await db
      .select({ request: eInvoiceRequests, transaction: posTransactions })
      .from(eInvoiceRequests)
      .leftJoin(posTransactions, eq(eInvoiceRequests.transaction_id, posTransactions.id))
      .where(
        status
          ? and(
              eq(eInvoiceRequests.tenant_id, tenantId),
              eq(eInvoiceRequests.status, status as "pending" | "submitted" | "rejected"),
            )
          : eq(eInvoiceRequests.tenant_id, tenantId),
      )
      .orderBy(desc(eInvoiceRequests.created_at));

    return c.json(
      success(
        rows.map((row) =>
          mapRequestRow(
            row.request,
            row.transaction,
          ),
        ),
      ),
    );
  },
);

// POST /tenants/:tenantId/einvoice
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", CreateEInvoiceSchema),
  async (c) => {
    const user = c.get("user");
    const tenantRole = c.get("tenantRole") as string;
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    const [transaction] = await db
      .select()
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.id, body.transactionId),
          eq(posTransactions.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!transaction) {
      return c.json(error("NOT_FOUND", "Transaction not found"), 404);
    }

    if (
      tenantRole !== "admin" &&
      tenantRole !== "staff" &&
      transaction.customer_id !== user.id
    ) {
      return c.json(error("FORBIDDEN", "No access to this transaction"), 403);
    }

    const [existing] = await db
      .select({ id: eInvoiceRequests.id })
      .from(eInvoiceRequests)
      .where(
        and(
          eq(eInvoiceRequests.tenant_id, tenantId),
          eq(eInvoiceRequests.transaction_id, body.transactionId),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        error("CONFLICT", "An e-invoice request already exists for this receipt"),
        409,
      );
    }

    const id = generateId();

    await db.insert(eInvoiceRequests).values({
      id,
      tenant_id: tenantId,
      transaction_id: body.transactionId,
      receipt_number: body.receiptNumber,
      buyer_tin: body.buyerTin,
      buyer_id_type: body.buyerIdType,
      buyer_id_value: body.buyerIdValue,
      buyer_name: body.buyerName,
      buyer_email: body.buyerEmail,
      buyer_phone: body.buyerPhone ?? null,
      buyer_address: body.buyerAddress,
      buyer_sst_reg_no: body.buyerSstRegNo ?? null,
    });

    await logAudit({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "einvoice.created",
      resourceId: id,
    });

    return c.json(success({ id }), 201);
  },
);

// POST /tenants/:tenantId/einvoice/:requestId/submit
app.post(
  "/:requestId/submit",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", MarkSubmittedSchema),
  async (c) => {
    const requestId = c.req.param("requestId");
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string;
    const body = c.req.valid("json");

    const result = await markRequestSubmitted({
      tenantId,
      requestId,
      actorId: user.id,
      actorRole: tenantRole,
      lhdnSubmissionId: body.lhdnSubmissionId,
    });

    if (!result.ok) {
      return c.json(result.response, result.status as any);
    }

    return c.json(result.payload);
  },
);

// PATCH /tenants/:tenantId/einvoice/:requestId/submitted
app.patch(
  "/:requestId/submitted",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", MarkSubmittedSchema),
  async (c) => {
    const requestId = c.req.param("requestId");
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string;
    const body = c.req.valid("json");

    const result = await markRequestSubmitted({
      tenantId,
      requestId,
      actorId: user.id,
      actorRole: tenantRole,
      lhdnSubmissionId: body.lhdnSubmissionId,
    });

    if (!result.ok) {
      return c.json(result.response, result.status as any);
    }

    return c.json(result.payload);
  },
);

// PATCH /tenants/:tenantId/einvoice/:requestId/rejected
app.patch(
  "/:requestId/rejected",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", MarkRejectedSchema),
  async (c) => {
    const requestId = c.req.param("requestId");
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string;
    const body = c.req.valid("json");

    const row = await getRequestWithTransaction(tenantId, requestId);
    if (!row) {
      return c.json(error("NOT_FOUND", "e-Invoice request not found"), 404);
    }
    if (row.request.status !== "pending") {
      return c.json(
        error("INVALID_STATUS", "Only pending requests can be rejected"),
        422,
      );
    }

    await db
      .update(eInvoiceRequests)
      .set({
        status: "rejected",
        rejection_reason: body.reason,
      })
      .where(eq(eInvoiceRequests.id, requestId));

    await logAudit({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "einvoice.rejected",
      resourceId: requestId,
    });

    return c.json(success({ message: "e-Invoice request rejected" }));
  },
);

// PATCH /tenants/:tenantId/einvoice/:requestId/pending
app.patch(
  "/:requestId/pending",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const requestId = c.req.param("requestId");
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string;

    const row = await getRequestWithTransaction(tenantId, requestId);
    if (!row) {
      return c.json(error("NOT_FOUND", "e-Invoice request not found"), 404);
    }

    await db
      .update(eInvoiceRequests)
      .set({ status: "pending", rejection_reason: null })
      .where(eq(eInvoiceRequests.id, requestId));

    await logAudit({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "einvoice.reverted_pending",
      resourceId: requestId,
    });

    return c.json(success({ message: "e-Invoice request reverted to pending" }));
  },
);

export { app as einvoiceRouter };
