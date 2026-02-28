import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  memberRoleEnum,
  membershipStatusEnum,
  paymentGatewayEnum,
  tenantPlanEnum,
  tenantStatusEnum,
} from "./enums.js";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    auth_id: text("auth_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_auth_id_idx").on(t.auth_id),
    index("users_email_idx").on(t.email),
  ],
);

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    owner_id: text("owner_id")
      .notNull()
      .references(() => users.id),
    plan: tenantPlanEnum("plan").notNull().default("free"),
    status: tenantStatusEnum("status").notNull().default("trial"),
    settings: jsonb("settings").notNull().default({}),
    branding: jsonb("branding").notNull().default({}),
    e_invoice_profile: jsonb("e_invoice_profile"),
    payment_gateway: paymentGatewayEnum("payment_gateway").default("stripe"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenants_slug_idx").on(t.slug),
    index("tenants_owner_id_idx").on(t.owner_id),
    index("tenants_status_idx").on(t.status),
  ],
);

// ─── Tenant Memberships ──────────────────────────────────────────────────────
export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    role: memberRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    joined_at: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_memberships_tenant_id_idx").on(t.tenant_id),
    index("tenant_memberships_user_id_idx").on(t.user_id),
    index("tenant_memberships_tenant_role_idx").on(t.tenant_id, t.role),
    uniqueIndex("tenant_memberships_tenant_user_idx").on(
      t.tenant_id,
      t.user_id,
    ),
  ],
);
