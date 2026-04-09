import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id").references(() => users.id),
    external_id: text("external_id"),
    invoice_number: text("invoice_number").notNull(),
    amount: integer("amount").notNull().default(0),
    subtotal: integer("subtotal"),
    tax_rate: integer("tax_rate"),
    tax_amount: integer("tax_amount"),
    total_amount: integer("total_amount"),
    currency: text("currency").notNull().default("MYR"),
    status: text("status").notNull().default("draft"),
    items: jsonb("items").notNull().default([]),
    notes: text("notes"),
    issue_date: timestamp("issue_date", { withTimezone: true }),
    due_date: timestamp("due_date", { withTimezone: true }),
    myinvois_id: text("myinvois_id"),
    transaction_id: text("transaction_id"),
    payment_method: text("payment_method"),
    source: text("source"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invoices_tenant_id_idx").on(t.tenant_id),
    index("invoices_user_id_idx").on(t.user_id),
    index("invoices_tenant_status_idx").on(t.tenant_id, t.status),
    index("invoices_tenant_issue_date_idx").on(t.tenant_id, t.issue_date),
    uniqueIndex("invoices_tenant_invoice_number_idx").on(
      t.tenant_id,
      t.invoice_number,
    ),
    uniqueIndex("invoices_tenant_external_id_idx").on(t.tenant_id, t.external_id),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoice_id: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    external_id: text("external_id"),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit_price: integer("unit_price").notNull().default(0),
    tax_rate: integer("tax_rate"),
    tax_amount: integer("tax_amount"),
    total: integer("total"),
    classification_code: text("classification_code"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invoice_items_tenant_id_idx").on(t.tenant_id),
    index("invoice_items_invoice_id_idx").on(t.invoice_id),
    uniqueIndex("invoice_items_tenant_external_id_idx").on(
      t.tenant_id,
      t.external_id,
    ),
  ],
);
