/**
 * Transform Convex export data → PostgreSQL-ready format
 *
 * Key transformations:
 * - Convex _id → nanoid(21) text PK (via stable mapping)
 * - _creationTime (epoch ms) → ISO timestamptz
 * - camelCase field names → snake_case
 * - Money floats → integer cents (×100)
 * - Reference IDs (_id format) → mapped nanoid IDs
 * - Remove Convex-specific fields (_id, _creationTime)
 *
 * Reads from:  ./data/convex-export/<table>.json
 * Writes to:   ./data/pg-import/<table>.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { customAlphabet } from "nanoid";

const EXPORT_DIR = join(import.meta.dirname, "data", "convex-export");
const IMPORT_DIR = join(import.meta.dirname, "data", "pg-import");

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateId = customAlphabet(alphabet, 21);

// ─── ID Mapping ──────────────────────────────────────────────────────────────
// Global map: Convex _id → nanoid. Ensures FK references remain consistent.
const idMap = new Map<string, string>();

function mapId(convexId: string): string {
  if (!convexId) return convexId;
  const existing = idMap.get(convexId);
  if (existing) return existing;
  const newId = generateId();
  idMap.set(convexId, newId);
  return newId;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function epochMsToIso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

/**
 * Convert a money value to cents. Convex may store as float (e.g., 50.00)
 * while PostgreSQL schema uses integer cents (5000).
 */
function toCents(value: unknown): number {
  if (typeof value === "number") {
    // If value looks like it's already in cents (> 100 and integer), keep it
    if (Number.isInteger(value) && value >= 100) return value;
    // Otherwise treat as ringgit amount → multiply by 100
    return Math.round(value * 100);
  }
  return 0;
}

// ─── Table-specific field configs ────────────────────────────────────────────

/** Fields that contain money values (need toCents conversion) */
const MONEY_FIELDS: Record<string, string[]> = {
  services: ["price"],
  products: ["price"],
  orders: ["totalAmount"],
  orderItems: ["snapshotPrice"],
  memberships: ["price"],
  payments: ["amount"],
  posTransactions: ["subtotal", "discount", "total"],
  sessionPackages: ["price"],
  vouchers: ["value"], // Note: percentage vouchers won't be multiplied (value < 100)
  giftCards: ["initialBalance", "currentBalance"],
  giftCardTransactions: ["amount", "balanceAfter"],
  voucherRedemptions: ["discountAmount"],
};

/** Fields that are FK references to other documents (Convex _id → mapped nanoid) */
const REFERENCE_FIELDS: Record<string, string[]> = {
  tenants: ["ownerId"],
  tenantMemberships: ["userId", "tenantId"],
  services: ["tenantId", "createdBy"],
  bookings: ["tenantId", "customerId", "serviceId", "staffId"],
  bookingEvents: ["tenantId", "bookingId", "actorId"],
  products: ["tenantId", "createdBy"],
  orders: ["tenantId", "customerId"],
  orderItems: ["orderId", "productId"],
  memberships: ["tenantId"],
  payments: ["tenantId", "customerId", "orderId", "bookingId"],
  subscriptions: ["tenantId", "customerId", "membershipId"],
  stripeAccounts: ["tenantId"],
  posTransactions: ["tenantId", "customerId", "staffId", "voucherId"],
  checkIns: ["tenantId", "userId", "checkedInBy"],
  memberQrCodes: ["tenantId", "userId"],
  sessionPackages: ["tenantId", "serviceId"],
  sessionCredits: ["tenantId", "userId", "packageId"],
  sessionLogs: ["tenantId", "clientId", "coachId", "bookingId", "creditId"],
  vouchers: ["tenantId"],
  voucherRedemptions: ["tenantId", "voucherId", "userId"],
  giftCards: ["tenantId"],
  giftCardTransactions: ["giftCardId", "tenantId", "createdBy"],
  notifications: ["userId", "tenantId"],
  pushTokens: ["userId"],
  staffAvailability: ["staffId", "tenantId"],
  businessHours: ["tenantId"],
  blockedSlots: ["tenantId", "staffId", "createdBy"],
  eInvoiceRequests: ["tenantId", "transactionId"],
  files: ["tenantId", "uploadedBy"],
  featureFlags: ["tenantId"],
  auditLogs: ["tenantId", "actorId"],
};

// ─── Convex → PostgreSQL table name mapping ─────────────────────────────────

const TABLE_NAME_MAP: Record<string, string> = {
  users: "users",
  tenants: "tenants",
  tenantMemberships: "tenant_memberships",
  services: "services",
  bookings: "bookings",
  bookingEvents: "booking_events",
  products: "products",
  orders: "orders",
  orderItems: "order_items",
  memberships: "memberships",
  payments: "payments",
  subscriptions: "subscriptions",
  stripeAccounts: "stripe_accounts",
  posTransactions: "pos_transactions",
  checkIns: "check_ins",
  memberQrCodes: "member_qr_codes",
  sessionPackages: "session_packages",
  sessionCredits: "session_credits",
  sessionLogs: "session_logs",
  vouchers: "vouchers",
  voucherRedemptions: "voucher_redemptions",
  giftCards: "gift_cards",
  giftCardTransactions: "gift_card_transactions",
  notifications: "notifications",
  pushTokens: "push_tokens",
  staffAvailability: "staff_availability",
  businessHours: "business_hours",
  blockedSlots: "blocked_slots",
  eInvoiceRequests: "e_invoice_requests",
  files: "files",
  featureFlags: "feature_flags",
  auditLogs: "audit_logs",
  platformConfig: "platform_config",
};

// ─── Transform a single document ────────────────────────────────────────────

function transformDocument(
  convexTable: string,
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const moneyFields = new Set(MONEY_FIELDS[convexTable] ?? []);
  const refFields = new Set(REFERENCE_FIELDS[convexTable] ?? []);

  // Map _id to nanoid
  if (doc._id) {
    result.id = mapId(doc._id as string);
  }

  // Map _creationTime to created_at (if no explicit createdAt field)
  if (doc._creationTime && !doc.createdAt && !doc.created_at) {
    result.created_at = epochMsToIso(doc._creationTime as number);
  }

  for (const [key, value] of Object.entries(doc)) {
    // Skip Convex internal fields
    if (key === "_id" || key === "_creationTime") continue;

    const snakeKey = camelToSnake(key);

    if (value === null || value === undefined) {
      result[snakeKey] = null;
      continue;
    }

    // Money fields → cents
    if (moneyFields.has(key)) {
      result[snakeKey] = toCents(value);
      continue;
    }

    // Reference fields → mapped nanoid
    if (refFields.has(key)) {
      result[snakeKey] = value ? mapId(value as string) : null;
      continue;
    }

    // Timestamp fields that are epoch ms
    if (typeof value === "number" && (key.endsWith("At") || key === "timestamp")) {
      result[snakeKey] = epochMsToIso(value);
      continue;
    }

    // Objects/arrays stay as-is (will become jsonb)
    if (typeof value === "object") {
      result[snakeKey] = value;
      continue;
    }

    result[snakeKey] = value;
  }

  return result;
}

// ─── Transform all tables ───────────────────────────────────────────────────

function transformTable(convexTable: string): number {
  const inputPath = join(EXPORT_DIR, `${convexTable}.json`);
  if (!existsSync(inputPath)) {
    console.warn(`  SKIP: No export file for "${convexTable}"`);
    return 0;
  }

  const raw = readFileSync(inputPath, "utf-8");
  const docs: Record<string, unknown>[] = JSON.parse(raw);

  if (docs.length === 0) {
    console.log(`  SKIP: "${convexTable}" is empty`);
    return 0;
  }

  const pgTable = TABLE_NAME_MAP[convexTable] ?? camelToSnake(convexTable);
  const transformed = docs.map((doc) => transformDocument(convexTable, doc));

  const outPath = join(IMPORT_DIR, `${pgTable}.json`);
  writeFileSync(outPath, JSON.stringify(transformed, null, 2));
  console.log(`  OK: ${convexTable} → ${pgTable} (${transformed.length} rows)`);
  return transformed.length;
}

function main() {
  console.log("=== Transform Convex → PostgreSQL ===\n");

  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, { recursive: true });
  }

  const tables = Object.keys(TABLE_NAME_MAP);
  let totalRows = 0;
  const summary: Record<string, number> = {};

  for (const table of tables) {
    const count = transformTable(table);
    summary[TABLE_NAME_MAP[table]!] = count;
    totalRows += count;
  }

  // Write ID mapping for debugging
  const idMapPath = join(IMPORT_DIR, "_id_map.json");
  const idMapObj = Object.fromEntries(idMap);
  writeFileSync(idMapPath, JSON.stringify(idMapObj, null, 2));

  // Write transform manifest
  const manifest = {
    transformedAt: new Date().toISOString(),
    tables: summary,
    totalRows,
    idMappings: idMap.size,
  };
  writeFileSync(join(IMPORT_DIR, "_manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Transformed ${totalRows} rows across ${tables.length} tables`);
  console.log(`ID mappings: ${idMap.size} Convex IDs → nanoid`);
}

main();
