import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  giftCardStatusEnum,
  giftCardTransactionTypeEnum,
  voucherSourceEnum,
  voucherTypeEnum,
} from "./enums";
import { tenants, users } from "./core";

// ─── Vouchers ────────────────────────────────────────────────────────────────
export const vouchers = pgTable(
  "vouchers",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: voucherTypeEnum("type").notNull(),
    value: integer("value").notNull(), // cents for fixed, percentage for percentage
    max_uses: integer("max_uses"),
    used_count: integer("used_count").notNull().default(0),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    is_active: boolean("is_active").notNull().default(true),
    source: voucherSourceEnum("source"),
    partner_name: text("partner_name"),
    partner_logo: text("partner_logo"),
    description: text("description"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("vouchers_tenant_id_idx").on(t.tenant_id),
    index("vouchers_code_idx").on(t.code),
    index("vouchers_tenant_active_idx").on(t.tenant_id, t.is_active),
  ],
);

// ─── Voucher Redemptions ─────────────────────────────────────────────────────
export const voucherRedemptions = pgTable(
  "voucher_redemptions",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    voucher_id: text("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    discount_amount: integer("discount_amount").notNull(), // cents
    booking_id: text("booking_id"), // references bookings, but avoiding circular import
    order_id: text("order_id"), // references orders, but avoiding circular import
    redeemed_at: timestamp("redeemed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("voucher_redemptions_tenant_id_idx").on(t.tenant_id),
    index("voucher_redemptions_voucher_id_idx").on(t.voucher_id),
    index("voucher_redemptions_user_id_idx").on(t.user_id),
  ],
);

// ─── Gift Cards ──────────────────────────────────────────────────────────────
export const giftCards = pgTable(
  "gift_cards",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    initial_balance: integer("initial_balance").notNull(), // cents
    current_balance: integer("current_balance").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    purchaser_name: text("purchaser_name"),
    purchaser_email: text("purchaser_email"),
    recipient_name: text("recipient_name"),
    recipient_email: text("recipient_email"),
    message: text("message"),
    status: giftCardStatusEnum("status").notNull().default("active"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("gift_cards_tenant_id_idx").on(t.tenant_id),
    index("gift_cards_code_idx").on(t.code),
    index("gift_cards_tenant_status_idx").on(t.tenant_id, t.status),
  ],
);

// ─── Gift Card Transactions ──────────────────────────────────────────────────
export const giftCardTransactions = pgTable(
  "gift_card_transactions",
  {
    id: text("id").primaryKey(),
    gift_card_id: text("gift_card_id")
      .notNull()
      .references(() => giftCards.id, { onDelete: "cascade" }),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: giftCardTransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(), // cents (positive)
    balance_after: integer("balance_after").notNull(), // cents
    pos_transaction_id: text("pos_transaction_id"), // references posTransactions, avoiding circular import
    note: text("note"),
    created_by: text("created_by").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("gift_card_transactions_gift_card_id_idx").on(t.gift_card_id),
    index("gift_card_transactions_tenant_id_idx").on(t.tenant_id),
  ],
);
