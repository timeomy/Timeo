import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";

// ─── Loyalty Points ─────────────────────────────────────────────────────
export const loyaltyPoints = pgTable(
  "loyalty_points",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    lifetime_earned: integer("lifetime_earned").notNull().default(0),
    lifetime_redeemed: integer("lifetime_redeemed").notNull().default(0),
    tier: text("tier").notNull().default("bronze"),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("loyalty_points_tenant_user_idx").on(t.tenant_id, t.user_id),
    index("loyalty_points_tenant_id_idx").on(t.tenant_id),
  ],
);

// ─── Loyalty Transactions ───────────────────────────────────────────────
export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'earned' | 'redeemed' | 'expired' | 'adjusted'
    points: integer("points").notNull(),
    balance_after: integer("balance_after").notNull(),
    reference_type: text("reference_type"),
    reference_id: text("reference_id"),
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("loyalty_transactions_tenant_user_idx").on(t.tenant_id, t.user_id),
    index("loyalty_transactions_tenant_id_idx").on(t.tenant_id),
  ],
);
