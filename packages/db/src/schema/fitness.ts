import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { checkInMethodEnum, sessionTypeEnum } from "./enums";
import { tenants, users } from "./core";
import { services } from "./booking";
import { bookings } from "./booking";

// ─── Check-ins ───────────────────────────────────────────────────────────────
export const checkIns = pgTable(
  "check_ins",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    method: checkInMethodEnum("method").notNull(),
    checked_in_by: text("checked_in_by").references(() => users.id),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("check_ins_tenant_id_idx").on(t.tenant_id),
    index("check_ins_user_id_idx").on(t.user_id),
    index("check_ins_tenant_date_idx").on(t.tenant_id, t.timestamp),
  ],
);

// ─── Member QR Codes ─────────────────────────────────────────────────────────
export const memberQrCodes = pgTable(
  "member_qr_codes",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    code: text("code").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("member_qr_codes_tenant_id_idx").on(t.tenant_id),
    index("member_qr_codes_user_id_idx").on(t.user_id),
    index("member_qr_codes_code_idx").on(t.code),
  ],
);

// ─── Session Packages ────────────────────────────────────────────────────────
export const sessionPackages = pgTable(
  "session_packages",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    session_count: integer("session_count").notNull(),
    price: integer("price").notNull(), // cents
    currency: text("currency").notNull().default("MYR"),
    service_id: text("service_id").references(() => services.id),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("session_packages_tenant_id_idx").on(t.tenant_id),
    index("session_packages_tenant_active_idx").on(
      t.tenant_id,
      t.is_active,
    ),
  ],
);

// ─── Session Credits ─────────────────────────────────────────────────────────
export const sessionCredits = pgTable(
  "session_credits",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    package_id: text("package_id")
      .notNull()
      .references(() => sessionPackages.id),
    total_sessions: integer("total_sessions").notNull(),
    used_sessions: integer("used_sessions").notNull().default(0),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    purchased_at: timestamp("purchased_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("session_credits_tenant_id_idx").on(t.tenant_id),
    index("session_credits_user_id_idx").on(t.user_id),
    index("session_credits_tenant_user_idx").on(t.tenant_id, t.user_id),
  ],
);

// ─── Session Logs ────────────────────────────────────────────────────────────
export const sessionLogs = pgTable(
  "session_logs",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    client_id: text("client_id")
      .notNull()
      .references(() => users.id),
    coach_id: text("coach_id")
      .notNull()
      .references(() => users.id),
    booking_id: text("booking_id").references(() => bookings.id),
    credit_id: text("credit_id").references(() => sessionCredits.id),
    session_type: sessionTypeEnum("session_type").notNull(),
    notes: text("notes"),
    exercises: jsonb("exercises").notNull().default([]),
    metrics: jsonb("metrics"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("session_logs_tenant_id_idx").on(t.tenant_id),
    index("session_logs_client_id_idx").on(t.client_id),
    index("session_logs_coach_id_idx").on(t.coach_id),
    index("session_logs_tenant_client_idx").on(t.tenant_id, t.client_id),
  ],
);
