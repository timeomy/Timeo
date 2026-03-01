import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  notificationTypeEnum,
  pushTokenPlatformEnum,
} from "./enums";
import { tenants, users } from "./core";

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data"),
    read: boolean("read").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.user_id),
    index("notifications_user_unread_idx").on(t.user_id, t.read),
    index("notifications_tenant_id_idx").on(t.tenant_id),
  ],
);

// ─── Notification Preferences ────────────────────────────────────────────────
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email_booking_confirm: boolean("email_booking_confirm")
      .notNull()
      .default(true),
    email_booking_reminder: boolean("email_booking_reminder")
      .notNull()
      .default(true),
    email_order_update: boolean("email_order_update")
      .notNull()
      .default(true),
    push_enabled: boolean("push_enabled").notNull().default(true),
    in_app_enabled: boolean("in_app_enabled").notNull().default(true),
  },
  (t) => [
    uniqueIndex("notification_preferences_user_tenant_idx").on(
      t.user_id,
      t.tenant_id,
    ),
  ],
);

// ─── Push Tokens ─────────────────────────────────────────────────────────────
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull(),
    platform: pushTokenPlatformEnum("platform").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("push_tokens_user_id_idx").on(t.user_id),
    index("push_tokens_token_idx").on(t.token),
  ],
);
