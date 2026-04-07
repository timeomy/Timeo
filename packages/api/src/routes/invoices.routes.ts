import { Hono } from "hono";
import { db } from "@timeo/db";
import { sql } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /tenants/:tenantId/invoices
app.get("/", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db.execute(sql`
    SELECT * FROM invoices WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
  `);
  return c.json(success(rows));
});

// GET /tenants/:tenantId/invoices/:id
app.get("/:id", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db.execute(sql`
    SELECT * FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
  `);
  if (!row) return c.json(error("NOT_FOUND", "Invoice not found"), 404);
  return c.json(success(row));
});

// POST /tenants/:tenantId/invoices
app.post("/", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const id = generateId();

  // Generate invoice number: INV-YYYYMM-NNNN
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [countRow] = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM invoices
    WHERE tenant_id = ${tenantId}
    AND invoice_number LIKE ${`INV-${yyyymm}-%`}
  `);
  const seq = String(Number((countRow as { cnt: string }).cnt) + 1).padStart(4, "0");
  const invoiceNumber = `INV-${yyyymm}-${seq}`;

  await db.execute(sql`
    INSERT INTO invoices (id, tenant_id, user_id, invoice_number, amount, tax_amount, currency, status, items)
    VALUES (
      ${id}, ${tenantId}, ${body.userId ?? null}, ${invoiceNumber},
      ${body.amount ?? 0}, ${body.taxAmount ?? 0}, ${body.currency ?? "MYR"},
      ${body.status ?? "draft"}, ${JSON.stringify(body.items ?? [])}::jsonb
    )
  `);

  return c.json(success({ id, invoiceNumber }), 201);
});

// PATCH /tenants/:tenantId/invoices/:id
app.patch("/:id", authMiddleware, tenantMiddleware, requireRole("admin"), async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = await c.req.json();

  await db.execute(sql`
    UPDATE invoices SET
      status = COALESCE(${body.status}, status),
      myinvois_id = COALESCE(${body.myinvoisId ?? null}, myinvois_id)
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `);
  return c.json(success({ message: "Updated" }));
});

export { app as invoicesRouter };
