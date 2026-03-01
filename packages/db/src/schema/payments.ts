import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  paymentStatusEnum,
  posPaymentMethodEnum,
  posTransactionStatusEnum,
  stripeAccountStatusEnum,
  subscriptionStatusEnum,
} from "./enums";
import { tenants, users } from "./core";
import { orders } from "./commerce";
import { bookings } from "./booking";
import { memberships } from "./commerce";
import { vouchers } from "./promotions";

// ─── Payments ────────────────────────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id),
    order_id: text("order_id").references(() => orders.id),
    booking_id: text("booking_id").references(() => bookings.id),
    stripe_payment_intent_id: text("stripe_payment_intent_id"),
    rm_order_id: text("rm_order_id"), // Revenue Monster order ID
    amount: integer("amount").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payments_tenant_id_idx").on(t.tenant_id),
    index("payments_customer_id_idx").on(t.customer_id),
    index("payments_order_id_idx").on(t.order_id),
    index("payments_booking_id_idx").on(t.booking_id),
    index("payments_stripe_pi_idx").on(t.stripe_payment_intent_id),
    index("payments_rm_order_id_idx").on(t.rm_order_id),
  ],
);

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id),
    membership_id: text("membership_id")
      .notNull()
      .references(() => memberships.id),
    stripe_subscription_id: text("stripe_subscription_id"),
    stripe_customer_id: text("stripe_customer_id"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    current_period_start: timestamp("current_period_start", {
      withTimezone: true,
    }).notNull(),
    current_period_end: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    cancel_at_period_end: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscriptions_tenant_id_idx").on(t.tenant_id),
    index("subscriptions_customer_id_idx").on(t.customer_id),
    index("subscriptions_membership_id_idx").on(t.membership_id),
    index("subscriptions_stripe_sub_idx").on(t.stripe_subscription_id),
  ],
);

// ─── Stripe Accounts ─────────────────────────────────────────────────────────
export const stripeAccounts = pgTable(
  "stripe_accounts",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    stripe_account_id: text("stripe_account_id").notNull(),
    status: stripeAccountStatusEnum("status").notNull().default("pending"),
    charges_enabled: boolean("charges_enabled").notNull().default(false),
    payouts_enabled: boolean("payouts_enabled").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("stripe_accounts_tenant_id_idx").on(t.tenant_id)],
);

// ─── POS Transactions ────────────────────────────────────────────────────────
export const posTransactions = pgTable(
  "pos_transactions",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id),
    staff_id: text("staff_id")
      .notNull()
      .references(() => users.id),
    items: jsonb("items").notNull(), // array of { type, referenceId, name, price, quantity }
    subtotal: integer("subtotal").notNull(), // cents
    discount: integer("discount").notNull().default(0), // cents
    total: integer("total").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    payment_method: posPaymentMethodEnum("payment_method").notNull(),
    voucher_id: text("voucher_id").references(() => vouchers.id),
    status: posTransactionStatusEnum("status").notNull().default("completed"),
    receipt_number: text("receipt_number").notNull(),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pos_transactions_tenant_id_idx").on(t.tenant_id),
    index("pos_transactions_customer_id_idx").on(t.customer_id),
    index("pos_transactions_tenant_date_idx").on(
      t.tenant_id,
      t.created_at,
    ),
    index("pos_transactions_receipt_idx").on(t.receipt_number),
  ],
);
