import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { eInvoiceRequests, auditLogs } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateEInvoiceSchema } from "../lib/validation.js";

const app = new Hono();

// GET /tenants/:tenantId/einvoice
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(eInvoiceRequests)
      .where(eq(eInvoiceRequests.tenant_id, tenantId))
      .orderBy(desc(eInvoiceRequests.created_at));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/einvoice
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateEInvoiceSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
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

    await db.insert(auditLogs).values({
      id: generateId(),
      tenant_id: tenantId,
      actor_id: user.id,
      action: "einvoice.created",
      resource: "e_invoice_requests",
      resource_id: id,
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
  async (c) => {
    const requestId = c.req.param("requestId");
    const user = c.get("user");
    const tenantId = c.get("tenantId");

    const [request] = await db
      .select()
      .from(eInvoiceRequests)
      .where(eq(eInvoiceRequests.id, requestId))
      .limit(1);
    if (!request) return c.json(error("NOT_FOUND", "e-Invoice request not found"), 404);
    if (request.status !== "pending") {
      return c.json(error("INVALID_STATUS", "Only pending requests can be submitted"), 422);
    }

    // TODO: Submit to LHDN MyInvois API
    await db
      .update(eInvoiceRequests)
      .set({ status: "submitted", submitted_at: new Date() })
      .where(eq(eInvoiceRequests.id, requestId));

    await db.insert(auditLogs).values({
      id: generateId(),
      tenant_id: tenantId,
      actor_id: user.id,
      action: "einvoice.submitted",
      resource: "e_invoice_requests",
      resource_id: requestId,
    });

    return c.json(success({ message: "e-Invoice submitted" }));
  },
);

export { app as einvoiceRouter };
