import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bookingEventTypeEnum, bookingStatusEnum } from "./enums.js";
import { tenants, users } from "./core.js";

// ─── Services ────────────────────────────────────────────────────────────────
export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    duration_minutes: integer("duration_minutes").notNull(),
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
    index("services_tenant_id_idx").on(t.tenant_id),
    index("services_tenant_active_idx").on(t.tenant_id, t.is_active),
  ],
);

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id),
    service_id: text("service_id")
      .notNull()
      .references(() => services.id),
    staff_id: text("staff_id").references(() => users.id),
    start_time: timestamp("start_time", { withTimezone: true }).notNull(),
    end_time: timestamp("end_time", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_tenant_id_idx").on(t.tenant_id),
    index("bookings_customer_id_idx").on(t.customer_id),
    index("bookings_staff_id_idx").on(t.staff_id),
    index("bookings_tenant_status_idx").on(t.tenant_id, t.status),
    index("bookings_tenant_date_idx").on(t.tenant_id, t.start_time),
  ],
);

// ─── Booking Events ──────────────────────────────────────────────────────────
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    booking_id: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: bookingEventTypeEnum("type").notNull(),
    actor_id: text("actor_id")
      .notNull()
      .references(() => users.id),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("booking_events_booking_id_idx").on(t.booking_id)],
);

// ─── Staff Availability ──────────────────────────────────────────────────────
export const staffAvailability = pgTable(
  "staff_availability",
  {
    id: text("id").primaryKey(),
    staff_id: text("staff_id")
      .notNull()
      .references(() => users.id),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    day_of_week: integer("day_of_week").notNull(), // 0-6, 0=Sunday
    start_time: text("start_time").notNull(), // "HH:mm"
    end_time: text("end_time").notNull(), // "HH:mm"
    is_available: boolean("is_available").notNull().default(true),
  },
  (t) => [
    index("staff_availability_staff_id_idx").on(t.staff_id),
    index("staff_availability_tenant_id_idx").on(t.tenant_id),
    index("staff_availability_tenant_day_idx").on(
      t.tenant_id,
      t.day_of_week,
    ),
  ],
);

// ─── Business Hours ──────────────────────────────────────────────────────────
export const businessHours = pgTable(
  "business_hours",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    day_of_week: integer("day_of_week").notNull(), // 0-6, 0=Sunday
    open_time: text("open_time").notNull(), // "HH:mm"
    close_time: text("close_time").notNull(), // "HH:mm"
    is_open: boolean("is_open").notNull().default(true),
  },
  (t) => [
    index("business_hours_tenant_id_idx").on(t.tenant_id),
    index("business_hours_tenant_day_idx").on(t.tenant_id, t.day_of_week),
  ],
);

// ─── Blocked Slots ───────────────────────────────────────────────────────────
export const blockedSlots = pgTable(
  "blocked_slots",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    staff_id: text("staff_id").references(() => users.id),
    start_time: timestamp("start_time", { withTimezone: true }).notNull(),
    end_time: timestamp("end_time", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    created_by: text("created_by")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("blocked_slots_tenant_id_idx").on(t.tenant_id),
    index("blocked_slots_staff_id_idx").on(t.staff_id),
    index("blocked_slots_tenant_daterange_idx").on(
      t.tenant_id,
      t.start_time,
    ),
  ],
);
