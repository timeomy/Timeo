import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { eInvoiceIdTypeEnum, eInvoiceStatusEnum } from "./enums";
import { tenants } from "./core";
import { posTransactions } from "./payments";

// ─── e-Invoice Requests ──────────────────────────────────────────────────────
export const eInvoiceRequests = pgTable(
  "e_invoice_requests",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    transaction_id: text("transaction_id")
      .notNull()
      .references(() => posTransactions.id),
    receipt_number: text("receipt_number").notNull(),
    // Buyer details
    buyer_tin: text("buyer_tin").notNull(),
    buyer_id_type: eInvoiceIdTypeEnum("buyer_id_type").notNull(),
    buyer_id_value: text("buyer_id_value").notNull(),
    buyer_name: text("buyer_name").notNull(),
    buyer_email: text("buyer_email").notNull(),
    buyer_phone: text("buyer_phone"),
    buyer_address: jsonb("buyer_address").notNull(), // { line1, line2?, city, state, postcode, country }
    buyer_sst_reg_no: text("buyer_sst_reg_no"),
    // Status tracking
    status: eInvoiceStatusEnum("status").notNull().default("pending"),
    submitted_at: timestamp("submitted_at", { withTimezone: true }),
    lhdn_submission_id: text("lhdn_submission_id"),
    rejection_reason: text("rejection_reason"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("e_invoice_requests_tenant_id_idx").on(t.tenant_id),
    index("e_invoice_requests_transaction_id_idx").on(t.transaction_id),
    index("e_invoice_requests_receipt_idx").on(t.receipt_number),
    index("e_invoice_requests_tenant_status_idx").on(
      t.tenant_id,
      t.status,
    ),
  ],
);
