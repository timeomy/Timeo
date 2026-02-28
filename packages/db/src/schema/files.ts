import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { fileTypeEnum } from "./enums.js";
import { tenants, users } from "./core.js";

// ─── Files ───────────────────────────────────────────────────────────────────
export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    uploaded_by: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    storage_id: text("storage_id").notNull(),
    filename: text("filename").notNull(),
    mime_type: text("mime_type").notNull(),
    size: integer("size").notNull(), // bytes
    type: fileTypeEnum("type").notNull(),
    entity_id: text("entity_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("files_tenant_id_idx").on(t.tenant_id),
    index("files_entity_idx").on(t.type, t.entity_id),
    index("files_uploader_idx").on(t.uploaded_by),
  ],
);
