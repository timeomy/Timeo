import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { db } from "@timeo/db";
import {
  payments,
  posTransactions,
  bookings,
  services,
  users,
  orders,
  orderItems,
  products,
} from "@timeo/db/schema";
import { and, eq, gte, lte, sum, sql, desc } from "drizzle-orm";

const app = new Hono();

function parseDateRange(c: { req: { query: (key: string) => string | undefined } }) {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  return { from: fromDate, to: toDate };
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",");
}

function csvHeaders(type: string) {
  const date = new Date().toISOString().split("T")[0];
  return {
    "Content-Type": "text/csv",
    "Content-Disposition": `attachment; filename="report-${type}-${date}.csv"`,
  };
}

// GET /tenants/:tenantId/exports/revenue
app.get(
  "/revenue",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    const onlineRows = await db
      .select({
        date: payments.created_at,
        amount: payments.amount,
        status: payments.status,
      })
      .from(payments)
      .where(
        and(
          eq(payments.tenant_id, tenantId),
          gte(payments.created_at, from),
          lte(payments.created_at, to),
        ),
      )
      .orderBy(payments.created_at);

    const posRows = await db
      .select({
        date: posTransactions.created_at,
        amount: posTransactions.total,
        status: posTransactions.status,
      })
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.tenant_id, tenantId),
          gte(posTransactions.created_at, from),
          lte(posTransactions.created_at, to),
        ),
      )
      .orderBy(posTransactions.created_at);

    const header = "date,source,amount_myr,status";
    const rows = [
      ...onlineRows.map((r) =>
        toCsvRow([
          r.date?.toISOString().split("T")[0] ?? "",
          "online",
          (r.amount / 100).toFixed(2),
          r.status,
        ]),
      ),
      ...posRows.map((r) =>
        toCsvRow([
          r.date?.toISOString().split("T")[0] ?? "",
          "pos",
          (r.amount / 100).toFixed(2),
          r.status,
        ]),
      ),
    ];

    const csv = [header, ...rows].join("\n");
    return c.text(csv, 200, csvHeaders("revenue"));
  },
);

// GET /tenants/:tenantId/exports/bookings
app.get(
  "/bookings",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    const customerUsers = db
      .select({ id: users.id, name: users.name })
      .from(users)
      .as("customer_users");
    const staffUsers = db
      .select({ id: users.id, name: users.name })
      .from(users)
      .as("staff_users");

    const rows = await db
      .select({
        id: bookings.id,
        serviceName: services.name,
        customerName: customerUsers.name,
        staffName: staffUsers.name,
        startTime: bookings.start_time,
        status: bookings.status,
        amount: services.price,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.service_id, services.id))
      .leftJoin(customerUsers, eq(bookings.customer_id, customerUsers.id))
      .leftJoin(staffUsers, eq(bookings.staff_id, staffUsers.id))
      .where(
        and(
          eq(bookings.tenant_id, tenantId),
          gte(bookings.created_at, from),
          lte(bookings.created_at, to),
        ),
      )
      .orderBy(bookings.start_time);

    const header = "id,service,customer,staff,start_time,status,amount_myr";
    const csvRows = rows.map((r) =>
      toCsvRow([
        r.id,
        r.serviceName,
        r.customerName,
        r.staffName,
        r.startTime?.toISOString() ?? "",
        r.status,
        r.amount != null ? (r.amount / 100).toFixed(2) : "",
      ]),
    );

    const csv = [header, ...csvRows].join("\n");
    return c.text(csv, 200, csvHeaders("bookings"));
  },
);

// GET /tenants/:tenantId/exports/products
app.get(
  "/products",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    const rows = await db
      .select({
        productName: products.name,
        sku: products.sku,
        quantitySold: sum(orderItems.quantity),
        revenue: sum(sql`${orderItems.snapshot_price} * ${orderItems.quantity}`),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(
        and(
          eq(orders.tenant_id, tenantId),
          gte(orders.created_at, from),
          lte(orders.created_at, to),
        ),
      )
      .groupBy(products.name, products.sku)
      .orderBy(desc(sum(orderItems.quantity)));

    const header = "product_name,sku,quantity_sold,revenue_myr";
    const csvRows = rows.map((r) =>
      toCsvRow([
        r.productName,
        r.sku,
        r.quantitySold != null ? String(r.quantitySold) : "0",
        r.revenue != null ? (Number(r.revenue) / 100).toFixed(2) : "0.00",
      ]),
    );

    const csv = [header, ...csvRows].join("\n");
    return c.text(csv, 200, csvHeaders("products"));
  },
);

export { app as exportsRouter };
