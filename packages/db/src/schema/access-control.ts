import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  turnstileMatchModeEnum,
  turnstileStatusEnum,
  faceRegistrationStatusEnum,
  accessResultEnum,
  checkInMethodEnum,
} from "./enums";
import { tenants, users } from "./core";

// ─── Turnstile Devices ──────────────────────────────────────────────────────
export const turnstileDevices = pgTable(
  "turnstile_devices",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    device_sn: text("device_sn").notNull(),
    name: text("name").notNull(),
    mqtt_topic: text("mqtt_topic"),
    http_push_url: text("http_push_url"),
    match_mode: turnstileMatchModeEnum("match_mode")
      .notNull()
      .default("offline_fallback"),
    status: turnstileStatusEnum("status").notNull().default("active"),
    config: jsonb("config").default({}),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("turnstile_devices_tenant_id_idx").on(t.tenant_id),
    uniqueIndex("turnstile_devices_device_sn_idx").on(t.device_sn),
  ],
);

// ─── Face Registrations ─────────────────────────────────────────────────────
export const faceRegistrations = pgTable(
  "face_registrations",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    device_person_id: text("device_person_id").notNull(),
    device_sn: text("device_sn")
      .notNull()
      .references(() => turnstileDevices.device_sn),
    status: faceRegistrationStatusEnum("status").notNull().default("pending"),
    face_image_url: text("face_image_url"),
    registered_at: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    synced_at: timestamp("synced_at", { withTimezone: true }),
  },
  (t) => [
    index("face_registrations_tenant_id_idx").on(t.tenant_id),
    index("face_registrations_user_id_idx").on(t.user_id),
    index("face_registrations_device_sn_idx").on(t.device_sn),
    uniqueIndex("face_registrations_device_person_idx").on(
      t.device_sn,
      t.device_person_id,
    ),
  ],
);

// ─── Access Logs ────────────────────────────────────────────────────────────
export const accessLogs = pgTable(
  "access_logs",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    device_sn: text("device_sn").notNull(),
    user_id: text("user_id").references(() => users.id),
    person_id_from_device: text("person_id_from_device"),
    match_score: integer("match_score"),
    match_result: accessResultEnum("match_result").notNull(),
    deny_reason: text("deny_reason"),
    method: checkInMethodEnum("method").notNull().default("face"),
    device_raw_data: jsonb("device_raw_data"),
    sequence_no: integer("sequence_no"),
    cap_time: text("cap_time"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("access_logs_tenant_id_idx").on(t.tenant_id),
    index("access_logs_device_sn_idx").on(t.device_sn),
    index("access_logs_user_id_idx").on(t.user_id),
    index("access_logs_tenant_date_idx").on(t.tenant_id, t.created_at),
  ],
);
