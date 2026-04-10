import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, generateId } from "@timeo/db";
import {
  auditLogs,
  invoices,
  paymentRequests,
  posTransactions,
  tenants,
  users,
} from "@timeo/db/schema";
import { sendMail } from "@timeo/auth/email";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { createNotification } from "../services/notification.service.js";

const app = new Hono();

const InvoiceStatusSchema = z.enum(["draft", "sent", "paid", "void"]);

const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().min(0),
  taxRate: z.number().int().min(0).max(100).optional(),
});

const CreateInvoiceSchema = z.object({
  sourceType: z.enum(["payment_request", "pos_transaction", "manual"]).default("manual"),
  sourceId: z.string().optional(),
  userId: z.string().optional(),
  memberName: z.string().optional(),
  memberEmail: z.string().email().optional(),
  description: z.string().optional(),
  amount: z.number().int().min(0).optional(),
  taxRate: z.number().int().min(0).max(100).optional(),
  currency: z.string().default("MYR"),
  status: InvoiceStatusSchema.default("draft"),
  paymentMethod: z.string().optional(),
  notes: z.string().max(1000).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  items: z.array(InvoiceItemSchema).optional(),
});

const UpdateInvoiceSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  myinvoisId: z.string().optional().nullable(),
});

function parseDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getMonthToken(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildTenantInvoicePrefix(tenantSlug: string | null | undefined): string {
  const normalized = (tenantSlug ?? "TIMEO")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  return (normalized || "TIMEO").slice(0, 6);
}

async function generateInvoiceNumber(
  tenantId: string,
  tenantSlug: string | null | undefined,
  issueDate: Date,
) {
  const monthToken = getMonthToken(issueDate);
  const prefix = buildTenantInvoicePrefix(tenantSlug);
  const likePattern = `EINV-${prefix}-${monthToken}-%`;

  const rows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND invoice_number LIKE ${likePattern}
  `);

  const countValue = Number((rows[0] as { count?: number })?.count ?? 0);
  const sequence = String(countValue + 1).padStart(5, "0");
  return `EINV-${prefix}-${monthToken}-${sequence}`;
}

function buildInvoiceItems(input: {
  items?: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>;
  description?: string;
  amount?: number;
  taxRate: number;
}) {
  if (input.items && input.items.length > 0) {
    return input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate ?? input.taxRate,
    }));
  }

  if (input.description && typeof input.amount === "number") {
    return [
      {
        description: input.description,
        quantity: 1,
        unitPrice: input.amount,
        taxRate: input.taxRate,
      },
    ];
  }

  return [];
}

function computeInvoiceTotals(items: Array<{ quantity: number; unitPrice: number; taxRate: number }>) {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const itemSubtotal = item.quantity * item.unitPrice;
    subtotal += itemSubtotal;
    taxAmount += Math.round((itemSubtotal * item.taxRate) / 100);
  }

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

async function insertAuditLog(input: {
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    resource_type: "invoice",
    resource_id: input.resourceId,
    details: input.details,
  });
}

function invoiceSummaryRow(row: {
  invoice: typeof invoices.$inferSelect;
  memberName: string | null;
  memberEmail: string | null;
}) {
  return {
    ...row.invoice,
    memberName: row.memberName,
    memberEmail: row.memberEmail,
  };
}

function escapePdfText(input: string) {
  return input
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    "14 TL",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["T*", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

// GET /tenants/:tenantId/invoices
app.get("/", authMiddleware, tenantMiddleware, requireCapability("billing_transactional"), async (c) => {
  const tenantId = c.get("tenantId");
  const status = c.req.query("status");
  const memberId = c.req.query("memberId");
  const search = c.req.query("search");
  const from = parseDateOrNull(c.req.query("from"));
  const to = parseDateOrNull(c.req.query("to"));

  const whereClauses = [eq(invoices.tenant_id, tenantId)];

  if (status) {
    whereClauses.push(eq(invoices.status, status));
  }
  if (memberId) {
    whereClauses.push(eq(invoices.user_id, memberId));
  }

  const rows = await db
    .select({
      invoice: invoices,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.user_id, users.id))
    .where(
      search
        ? and(
            ...whereClauses,
            or(
              ilike(invoices.invoice_number, `%${search}%`),
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
            ),
          )
        : and(...whereClauses),
    )
    .orderBy(desc(invoices.created_at));

  const filtered = rows
    .map(invoiceSummaryRow)
    .filter((row) => {
      const compareDate = row.issue_date ?? row.created_at;
      if (from && compareDate < from) return false;
      if (to && compareDate > to) return false;
      return true;
    });

  return c.json(success(filtered));
});

// GET /tenants/:tenantId/invoices/mine
app.get("/mine", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");

  const rows = await db
    .select({
      invoice: invoices,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.user_id, users.id))
    .where(
      and(
        eq(invoices.tenant_id, tenantId),
        eq(invoices.user_id, user.id),
      ),
    )
    .orderBy(desc(invoices.created_at));

  return c.json(success(rows.map(invoiceSummaryRow)));
});

// GET /tenants/:tenantId/invoices/:id/pdf
app.get("/:id/pdf", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const tenantRole = c.get("tenantRole") as string;
  const id = c.req.param("id");

  const rows = await db
    .select({
      invoice: invoices,
      memberName: users.name,
      memberEmail: users.email,
      tenantName: tenants.name,
      tenantProfile: tenants.e_invoice_profile,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.user_id, users.id))
    .leftJoin(tenants, eq(invoices.tenant_id, tenants.id))
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return c.json(error("NOT_FOUND", "Invoice not found"), 404);
  }

  const isAdminLike = tenantRole === "admin" || tenantRole === "staff";
  if (!isAdminLike && row.invoice.user_id !== user.id) {
    return c.json(error("FORBIDDEN", "No access to this invoice"), 403);
  }

  const profile = (row.tenantProfile ?? {}) as Record<string, unknown>;
  const lineItems = Array.isArray(row.invoice.items)
    ? (row.invoice.items as Array<Record<string, unknown>>)
    : [];
  const issueDate = row.invoice.issue_date ?? row.invoice.created_at;

  const lines = [
    `${row.tenantName ?? "Timeo"} — Tax Invoice`,
    `Invoice No: ${row.invoice.invoice_number}`,
    `Invoice Date: ${issueDate.toLocaleDateString("en-MY")}`,
    `Status: ${row.invoice.status.toUpperCase()}`,
    "",
    `Member: ${row.memberName ?? "-"}`,
    `Email: ${row.memberEmail ?? "-"}`,
    `Payment Method: ${row.invoice.payment_method ?? "-"}`,
    "",
    "Items:",
    ...lineItems.map((item, index) => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
      const total = Number(item.total ?? quantity * unitPrice);
      const description = String(item.description ?? `Item ${index + 1}`);
      return `${index + 1}. ${description} x${quantity} — RM ${(total / 100).toFixed(2)}`;
    }),
    "",
    `Subtotal: RM ${((row.invoice.subtotal ?? 0) / 100).toFixed(2)}`,
    `Tax (${row.invoice.tax_rate ?? 0}%): RM ${((row.invoice.tax_amount ?? 0) / 100).toFixed(2)}`,
    `Total: RM ${((row.invoice.total_amount ?? row.invoice.amount ?? 0) / 100).toFixed(2)}`,
    "",
    `SST Reg No: ${String(profile.sstRegNo ?? "N/A")}`,
    `TIN: ${String(profile.tin ?? "N/A")}`,
  ];

  const pdf = buildSimplePdf(lines);
  c.header("Content-Type", "application/pdf");
  c.header(
    "Content-Disposition",
    `attachment; filename="${row.invoice.invoice_number}.pdf"`,
  );
  return c.body(pdf);
});

// GET /tenants/:tenantId/invoices/:id
app.get("/:id", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const tenantRole = c.get("tenantRole") as string;
  const id = c.req.param("id");

  const rows = await db
    .select({
      invoice: invoices,
      memberName: users.name,
      memberEmail: users.email,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      tenantProfile: tenants.e_invoice_profile,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.user_id, users.id))
    .leftJoin(tenants, eq(invoices.tenant_id, tenants.id))
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return c.json(error("NOT_FOUND", "Invoice not found"), 404);
  }

  const isAdminLike = tenantRole === "admin" || tenantRole === "staff";
  if (!isAdminLike && row.invoice.user_id !== user.id) {
    return c.json(error("FORBIDDEN", "No access to this invoice"), 403);
  }

  return c.json(
    success({
      ...row.invoice,
      memberName: row.memberName,
      memberEmail: row.memberEmail,
      tenant: {
        id: tenantId,
        name: row.tenantName,
        slug: row.tenantSlug,
        eInvoiceProfile: row.tenantProfile,
      },
    }),
  );
});

// POST /tenants/:tenantId/invoices
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireCapability("billing_transactional"),
  zValidator("json", CreateInvoiceSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const tenantRole = c.get("tenantRole") as string;
    const body = c.req.valid("json");

    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        eInvoiceProfile: tenants.e_invoice_profile,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return c.json(error("NOT_FOUND", "Tenant not found"), 404);
    }

    let invoiceUserId = body.userId ?? null;
    let memberName = body.memberName ?? null;
    let memberEmail = body.memberEmail ?? null;
    let description = body.description;
    let baseAmount = body.amount ?? 0;
    let paymentMethod = body.paymentMethod ?? null;
    const sourceType = body.sourceType;
    const sourceId = body.sourceId ?? null;

    if ((sourceType === "payment_request" || sourceType === "pos_transaction") && !sourceId) {
      return c.json(error("VALIDATION_ERROR", "sourceId is required for selected sourceType"), 422);
    }

    if (sourceType === "payment_request" && sourceId) {
      const rows = await db
        .select({ request: paymentRequests, memberName: users.name, memberEmail: users.email })
        .from(paymentRequests)
        .leftJoin(users, eq(paymentRequests.customer_id, users.id))
        .where(
          and(
            eq(paymentRequests.id, sourceId),
            eq(paymentRequests.tenant_id, tenantId),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) {
        return c.json(error("NOT_FOUND", "Payment request not found"), 404);
      }

      invoiceUserId = row.request.customer_id;
      memberName = row.memberName ?? memberName;
      memberEmail = row.memberEmail ?? memberEmail;
      description = description ?? `Membership payment: ${row.request.plan_name}`;
      baseAmount = row.request.amount;
      paymentMethod = paymentMethod ?? "duitnow_transfer";
    }

    if (sourceType === "pos_transaction" && sourceId) {
      const rows = await db
        .select({ transaction: posTransactions, memberName: users.name, memberEmail: users.email })
        .from(posTransactions)
        .leftJoin(users, eq(posTransactions.customer_id, users.id))
        .where(
          and(
            eq(posTransactions.id, sourceId),
            eq(posTransactions.tenant_id, tenantId),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) {
        return c.json(error("NOT_FOUND", "POS transaction not found"), 404);
      }

      invoiceUserId = row.transaction.customer_id;
      memberName = row.memberName ?? memberName;
      memberEmail = row.memberEmail ?? memberEmail;
      description = description ?? `POS receipt ${row.transaction.receipt_number}`;
      baseAmount = row.transaction.total;
      paymentMethod = paymentMethod ?? row.transaction.payment_method;
    }

    if (!description && (!body.items || body.items.length === 0)) {
      return c.json(
        error("VALIDATION_ERROR", "description or items is required"),
        422,
      );
    }

    const profile = (tenant.eInvoiceProfile ?? {}) as Record<string, unknown>;
    const profileTaxRate =
      typeof profile.sstRate === "number" ? Math.trunc(profile.sstRate) : undefined;
    const defaultTaxRate = profile.sstRegNo ? (profileTaxRate ?? 6) : 0;
    const appliedTaxRate = body.taxRate ?? defaultTaxRate;

    const normalizedItems = buildInvoiceItems({
      items: body.items,
      description,
      amount: baseAmount,
      taxRate: appliedTaxRate,
    });

    if (normalizedItems.length === 0) {
      return c.json(error("VALIDATION_ERROR", "Unable to build invoice items"), 422);
    }

    const totalizedItems = normalizedItems.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    const totals = computeInvoiceTotals(
      normalizedItems.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? appliedTaxRate,
      })),
    );

    const issueDate = parseDateOrNull(body.issueDate) ?? new Date();
    const dueDate = parseDateOrNull(body.dueDate);
    const invoiceNumber = await generateInvoiceNumber(tenantId, tenant.slug, issueDate);
    const invoiceId = generateId();

    await db.insert(invoices).values({
      id: invoiceId,
      tenant_id: tenantId,
      user_id: invoiceUserId,
      invoice_number: invoiceNumber,
      amount: totals.total,
      subtotal: totals.subtotal,
      tax_rate: appliedTaxRate,
      tax_amount: totals.taxAmount,
      total_amount: totals.total,
      currency: body.currency,
      status: body.status,
      items: totalizedItems,
      notes: body.notes ?? null,
      issue_date: issueDate,
      due_date: dueDate,
      transaction_id: sourceId,
      payment_method: paymentMethod,
      source: sourceType,
      updated_at: new Date(),
    });

    await insertAuditLog({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "invoice.created",
      resourceId: invoiceId,
      details: {
        invoiceNumber,
        sourceType,
        sourceId,
        memberName,
        memberEmail,
      },
    });

    return c.json(
      success({
        id: invoiceId,
        invoiceNumber,
        status: body.status,
      }),
      201,
    );
  },
);

// PATCH /tenants/:tenantId/invoices/:id
app.patch(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  requireCapability("billing_transactional"),
  zValidator("json", UpdateInvoiceSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const tenantRole = c.get("tenantRole") as string;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [existing] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(error("NOT_FOUND", "Invoice not found"), 404);
    }

    await db
      .update(invoices)
      .set({
        status: body.status,
        notes: body.notes,
        due_date: body.dueDate === null ? null : parseDateOrNull(body.dueDate),
        myinvois_id: body.myinvoisId,
        updated_at: new Date(),
      })
      .where(eq(invoices.id, id));

    await insertAuditLog({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "invoice.updated",
      resourceId: id,
      details: {
        status: body.status,
      },
    });

    return c.json(success({ message: "Invoice updated" }));
  },
);

// POST /tenants/:tenantId/invoices/:id/email
app.post(
  "/:id/email",
  authMiddleware,
  tenantMiddleware,
  requireCapability("billing_transactional"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const tenantRole = c.get("tenantRole") as string;
    const id = c.req.param("id");

    const rows = await db
      .select({
        invoice: invoices,
        memberName: users.name,
        memberEmail: users.email,
        tenantName: tenants.name,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.user_id, users.id))
      .leftJoin(tenants, eq(invoices.tenant_id, tenants.id))
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenant_id, tenantId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return c.json(error("NOT_FOUND", "Invoice not found"), 404);
    }

    if (!row.memberEmail) {
      return c.json(
        error("VALIDATION_ERROR", "Member email is required to send invoice"),
        422,
      );
    }

    const totalAmount = row.invoice.total_amount ?? row.invoice.amount ?? 0;
    const issueDate = row.invoice.issue_date ?? row.invoice.created_at;
    const issueDateFormatted = issueDate.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://app.timeo.my";
    const portalInvoiceUrl = `${appUrl}/portal/billing?invoice=${row.invoice.id}`;

    await sendMail({
      to: row.memberEmail,
      subject: `Invoice ${row.invoice.invoice_number} from ${row.tenantName ?? "Timeo"}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;">
          <h2 style="margin:0 0 12px;">Invoice ${row.invoice.invoice_number}</h2>
          <p style="margin:0 0 8px;">Hi ${row.memberName ?? "there"},</p>
          <p style="margin:0 0 8px;">Your invoice is ready.</p>
          <ul style="padding-left:18px;margin:0 0 12px;">
            <li>Invoice Number: <strong>${row.invoice.invoice_number}</strong></li>
            <li>Date: <strong>${issueDateFormatted}</strong></li>
            <li>Total: <strong>RM ${(totalAmount / 100).toFixed(2)}</strong></li>
            <li>Status: <strong>${row.invoice.status}</strong></li>
          </ul>
          <p style="margin:0 0 16px;">You can view and download the PDF from your portal:</p>
          <p><a href="${portalInvoiceUrl}">View Invoice</a></p>
          <p style="margin:16px 0 0;">Thank you.</p>
        </div>
      `,
    });

    await db
      .update(invoices)
      .set({
        status: row.invoice.status === "draft" ? "sent" : row.invoice.status,
        updated_at: new Date(),
      })
      .where(eq(invoices.id, id));

    if (row.invoice.user_id) {
      await createNotification({
        userId: row.invoice.user_id,
        tenantId,
        type: "receipt",
        title: "New invoice sent",
        body: `Invoice ${row.invoice.invoice_number} has been emailed to you.`,
        data: { invoiceId: row.invoice.id },
      });
    }

    await insertAuditLog({
      tenantId,
      actorId: user.id,
      actorRole: tenantRole,
      action: "invoice.emailed",
      resourceId: id,
      details: {
        memberEmail: row.memberEmail,
      },
    });

    return c.json(success({ message: "Invoice email sent" }));
  },
);

export { app as invoicesRouter };
