import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
    external_id: text("external_id"),
    method: checkInMethodEnum("method").notNull(),
    gate: text("gate"),
    device: text("device"),
    entry_type: text("entry_type"),
    notes: text("notes"),
    checked_in_by: text("checked_in_by").references(() => users.id),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("check_ins_tenant_id_idx").on(t.tenant_id),
    index("check_ins_user_id_idx").on(t.user_id),
    index("check_ins_tenant_date_idx").on(t.tenant_id, t.timestamp),
    uniqueIndex("check_ins_tenant_external_id_idx").on(
      t.tenant_id,
      t.external_id,
    ),
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
    duration_minutes: integer("duration_minutes"),
    client_feedback: text("client_feedback"),
    notes: text("notes"),
    exercises: jsonb("exercises").notNull().default([]),
    metrics: jsonb("metrics"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    published: boolean("published").notNull().default(false),
    published_at: timestamp("published_at", { withTimezone: true }),
    training_types: text("training_types").array(),
    weight_kg: numeric("weight_kg"),
    sessions_used: integer("sessions_used").notNull().default(1),
  },
  (t) => [
    index("session_logs_tenant_id_idx").on(t.tenant_id),
    index("session_logs_client_id_idx").on(t.client_id),
    index("session_logs_coach_id_idx").on(t.coach_id),
    index("session_logs_tenant_client_idx").on(t.tenant_id, t.client_id),
  ],
);

// ─── Coach Availability ───────────────────────────────────────────────────────
export const coachAvailability = pgTable(
  "coach_availability",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    coach_id: text("coach_id")
      .notNull()
      .references(() => users.id),
    day_of_week: integer("day_of_week"),
    start_time: text("start_time"),
    end_time: text("end_time"),
    is_recurring: boolean("is_recurring").notNull().default(true),
    specific_date: text("specific_date"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("coach_availability_tenant_id_idx").on(t.tenant_id),
    index("coach_availability_coach_id_idx").on(t.coach_id),
  ],
);

// ─── Coach Bookings ───────────────────────────────────────────────────────────
export const coachBookings = pgTable(
  "coach_bookings",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    coach_id: text("coach_id")
      .notNull()
      .references(() => users.id),
    client_id: text("client_id")
      .notNull()
      .references(() => users.id),
    booking_date: text("booking_date"),
    start_time: text("start_time"),
    end_time: text("end_time"),
    status: text("status").notNull().default("confirmed"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("coach_bookings_tenant_id_idx").on(t.tenant_id),
    index("coach_bookings_coach_id_idx").on(t.coach_id),
    index("coach_bookings_client_id_idx").on(t.client_id),
  ],
);
// ─── Exercises Library ────────────────────────────────────────────────────────
export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    training_type: text("training_type").notNull(),
    equipment: text("equipment"),
    is_custom: boolean("is_custom").notNull().default(false),
    created_by: text("created_by").references(() => users.id),
    video_url: text("video_url"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("exercises_tenant_id_idx").on(t.tenant_id),
    index("exercises_training_type_idx").on(t.training_type),
  ],
);

// ─── Coach Client Notes ───────────────────────────────────────────────────────
export const coachClientNotes = pgTable(
  "coach_client_notes",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    coach_id: text("coach_id")
      .notNull()
      .references(() => users.id),
    client_id: text("client_id")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("coach_client_notes_coach_client_idx").on(t.coach_id, t.client_id),
    index("coach_client_notes_tenant_id_idx").on(t.tenant_id),
  ],
);
