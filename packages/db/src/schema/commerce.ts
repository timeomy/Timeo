import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { membershipIntervalEnum, orderStatusEnum } from "./enums";
import { tenants, users } from "./core";

// ─── Products ────────────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    image_url: text("image_url"),
    is_active: boolean("is_active").notNull().default(true),
    created_by: text("created_by")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("products_tenant_id_idx").on(t.tenant_id),
    index("products_tenant_active_idx").on(t.tenant_id, t.is_active),
  ],
);

// ─── Orders ──────────────────────────────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    total_amount: integer("total_amount").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_tenant_id_idx").on(t.tenant_id),
    index("orders_customer_id_idx").on(t.customer_id),
    index("orders_tenant_status_idx").on(t.tenant_id, t.status),
  ],
);

// ─── Order Items ─────────────────────────────────────────────────────────────
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    snapshot_price: integer("snapshot_price").notNull(), // cents
    snapshot_name: text("snapshot_name").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.order_id)],
);

// ─── Memberships (Plans) ────────────────────────────────────────────────────
export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    interval: membershipIntervalEnum("interval").notNull(),
    features: text("features").array().notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("memberships_tenant_id_idx").on(t.tenant_id)],
);
