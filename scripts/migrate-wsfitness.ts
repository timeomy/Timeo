/**
 * WS Fitness -> Timeo Migration Script
 *
 * Reads the full WS Fitness (Lovable/Supabase) JSON export and imports
 * into Timeo's PostgreSQL database via Drizzle ORM.
 *
 * Usage:
 *   npx tsx scripts/migrate-wsfitness.ts [--dry-run]
 *
 * Prerequisites:
 *   - PostgreSQL running with Timeo schema migrated
 *   - .env with DATABASE_URL set (or DATABASE_URL env var)
 *   - Export file at the path specified by EXPORT_FILE below
 */

import fs from "fs";
import path from "path";
import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";

// Drizzle schema imports
import { users, tenants, tenantMemberships } from "../packages/db/src/schema/core";
import { user as authUser, account as authAccount } from "../packages/db/src/schema/auth";
import {
  checkIns,
  memberQrCodes,
  sessionPackages,
  sessionCredits,
  sessionLogs,
} from "../packages/db/src/schema/fitness";
import { memberships } from "../packages/db/src/schema/commerce";
import { subscriptions, payments } from "../packages/db/src/schema/payments";
import { turnstileDevices, accessLogs } from "../packages/db/src/schema/access-control";
import { generateId } from "../packages/db/src/id";

// ─── Config ─────────────────────────────────────────────────────────────────

const EXPORT_FILE =
  process.env.EXPORT_FILE ||
  path.resolve(__dirname, "../wsfitness/wsfitness_full_export_2026-03-06.json");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;
const TENANT_NAME = "WS Fitness";
const TENANT_SLUG = "ws-fitness";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TableData {
  row_count: number;
  rows: any[];
}

interface ExportData {
  exported_at: string;
  exported_by: string;
  supabase_project_id: string;
  auth_users: { row_count: number; note: string; rows: any[] };
  tables: {
    profiles: TableData;
    user_roles: TableData;
    memberships: TableData;
    membership_plans: TableData;
    check_ins: TableData;
    clients: TableData;
    training_logs: TableData;
    payment_requests: TableData;
    turnstile_face_devices: TableData;
    turnstile_events: TableData;
    turnstile_face_logs: TableData;
    turnstile_face_enrollments: TableData;
    [key: string]: TableData;
  };
}

interface MigrationCounts {
  authUsers: number;
  timeoUsers: number;
  existingUsers: number;
  tenantMemberships: number;
  membershipPlans: number;
  subscriptions: number;
  qrCodes: number;
  checkIns: number;
  sessionPackages: number;
  sessionCredits: number;
  sessionLogs: number;
  payments: number;
  turnstileDevices: number;
  accessLogs: number;
  skipped: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapWsRoleToTimeo(wsRole: string): "customer" | "staff" | "admin" {
  switch (wsRole) {
    case "admin":
    case "it_admin":
      return "admin";
    case "coach":
    case "staff":
      return "staff";
    case "vendor":
    case "member":
    case "day_pass":
    case "studio":
    default:
      return "customer";
  }
}

function mapWsMembershipStatus(
  wsStatus: string
): "active" | "invited" | "suspended" {
  switch (wsStatus) {
    case "active":
      return "active";
    case "pending_approval":
    case "pending":
      return "invited";
    case "expired":
    case "rejected":
    case "vendor":
      return "suspended";
    default:
      return "active";
  }
}

function mapInterval(durationMonths: number): "monthly" | "yearly" {
  return durationMonths >= 12 ? "yearly" : "monthly";
}

/** Convert RM price (whole number) to cents. RM388 = 38800 cents. */
function rmToCents(rmPrice: number | string): number {
  return Math.round(parseFloat(String(rmPrice)) * 100);
}

/**
 * Map turnstile face log decision to Timeo access_result enum.
 * WS Fitness face logs have: "allow", "deny", or null.
 */
function mapAccessResult(
  decision: string | null
): "allowed" | "denied" | "stranger" {
  if (decision === "allow") return "allowed";
  if (decision === "deny") return "denied";
  return "stranger";
}

/**
 * Extract match score from a turnstile face log raw payload.
 * The raw_payload.match_result field contains the score (0-100).
 */
function extractMatchScore(rawPayload: any): number | null {
  if (!rawPayload) return null;
  const score = rawPayload.match_result;
  return typeof score === "number" ? score : null;
}

/** Process rows in batches, calling fn for each batch. */
async function processBatches<T>(
  rows: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<number>,
  label: string
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const count = await fn(batch);
    total += count;
    if ((i + batchSize) % 500 === 0 || i + batchSize >= rows.length) {
      process.stdout.write(`\r  ${label}: ${total} / ${rows.length}`);
    }
  }
  if (rows.length > 0) console.log("");
  return total;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("======================================================");
  console.log("  WS Fitness -> Timeo Migration");
  console.log("======================================================");
  if (DRY_RUN) console.log("\n[DRY RUN] No data will be written\n");

  // ── Load export ───────────────────────────────────────────────────────
  console.log(`Loading export from ${EXPORT_FILE}...`);
  if (!fs.existsSync(EXPORT_FILE)) {
    throw new Error(`Export file not found: ${EXPORT_FILE}`);
  }

  const raw = fs.readFileSync(EXPORT_FILE, "utf-8");
  const data: ExportData = JSON.parse(raw);
  const t = data.tables;

  console.log(`  Exported at:         ${data.exported_at}`);
  console.log(`  Profiles:            ${t.profiles.row_count}`);
  console.log(`  User roles:          ${t.user_roles.row_count}`);
  console.log(`  Membership plans:    ${t.membership_plans.row_count}`);
  console.log(`  Memberships:         ${t.memberships.row_count}`);
  console.log(`  Check-ins:           ${t.check_ins.row_count}`);
  console.log(`  Clients:             ${t.clients.row_count}`);
  console.log(`  Training logs:       ${t.training_logs.row_count}`);
  console.log(`  Payment requests:    ${t.payment_requests.row_count}`);
  console.log(`  Turnstile devices:   ${t.turnstile_face_devices.row_count}`);
  console.log(`  Turnstile events:    ${t.turnstile_events.row_count}`);
  console.log(`  Turnstile face logs: ${t.turnstile_face_logs.row_count}`);

  // ── Dry-run mode ──────────────────────────────────────────────────────
  if (DRY_RUN) {
    printMigrationPlan(data);
    return;
  }

  // ── Connect to DB ─────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set in environment or .env file");
  }

  console.log("\nConnecting to database...");
  const client = postgres(databaseUrl, { max: 5 });
  const db = drizzle(client);

  // ── Build lookup maps ─────────────────────────────────────────────────

  const profilesByUuid = new Map<string, any>();
  for (const p of t.profiles.rows) {
    profilesByUuid.set(p.id, p);
  }

  const rolesByUuid = new Map<string, string>();
  for (const r of t.user_roles.rows) {
    rolesByUuid.set(r.user_id, r.role);
  }

  const membershipsByUuid = new Map<string, any>();
  for (const m of t.memberships.rows) {
    membershipsByUuid.set(m.user_id, m);
  }

  const authUsersByUuid = new Map<string, any>();
  if (data.auth_users?.rows) {
    for (const au of data.auth_users.rows) {
      authUsersByUuid.set(au.id, au);
    }
  }

  const clientById = new Map<string, any>();
  for (const c of t.clients.rows) {
    clientById.set(c.id, c);
  }

  // ── ID mappings ───────────────────────────────────────────────────────
  const wsToTimeoUserId = new Map<string, string>();
  const wsToTimeoAuthId = new Map<string, string>();

  const counts: MigrationCounts = {
    authUsers: 0,
    timeoUsers: 0,
    existingUsers: 0,
    tenantMemberships: 0,
    membershipPlans: 0,
    subscriptions: 0,
    qrCodes: 0,
    checkIns: 0,
    sessionPackages: 0,
    sessionCredits: 0,
    sessionLogs: 0,
    payments: 0,
    turnstileDevices: 0,
    accessLogs: 0,
    skipped: 0,
  };

  // ── 1. Find admin user to be tenant owner ─────────────────────────────
  const adminRoles = t.user_roles.rows.filter(
    (r: any) => r.role === "admin"
  );
  if (adminRoles.length === 0) {
    throw new Error("No admin user found in export data");
  }
  const ownerWsId = adminRoles[0].user_id;
  const ownerProfile = profilesByUuid.get(ownerWsId);
  if (!ownerProfile) {
    throw new Error(`Owner profile not found for UUID: ${ownerWsId}`);
  }
  console.log(
    `\nTenant owner: ${ownerProfile.name} (${ownerProfile.email})`
  );

  // ── 2. Create users (auth + Timeo) ───────────────────────────────────
  console.log("\n-- Creating users --");

  for (const profile of t.profiles.rows) {
    const wsUuid = profile.id;
    const email = (profile.email || "").trim().toLowerCase();

    if (!email) {
      console.log(
        `  [SKIP] User without email: ${profile.name} (${wsUuid})`
      );
      counts.skipped++;
      continue;
    }

    // Check if user already exists in Timeo (by email)
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      wsToTimeoUserId.set(wsUuid, existing[0].id);
      wsToTimeoAuthId.set(wsUuid, existing[0].auth_id || "");
      counts.existingUsers++;
      continue;
    }

    const authData = authUsersByUuid.get(wsUuid);
    const name = profile.name || email.split("@")[0];
    const timeoAuthId = generateId();
    const timeoUserId = generateId();
    const accountId = generateId();

    // Create Better Auth user record
    await db.insert(authUser).values({
      id: timeoAuthId,
      name: name,
      email: email,
      emailVerified: !!(authData?.email_confirmed_at),
    });

    // Create credential account (no password -- users must reset)
    await db.insert(authAccount).values({
      id: accountId,
      accountId: timeoAuthId,
      providerId: "credential",
      userId: timeoAuthId,
      password: null,
    });

    // Create Timeo user
    await db.insert(users).values({
      id: timeoUserId,
      auth_id: timeoAuthId,
      email: email,
      name: name,
      avatar_url: profile.avatar_url || null,
      force_password_reset: true,
      created_at: new Date(profile.created_at),
    });

    wsToTimeoUserId.set(wsUuid, timeoUserId);
    wsToTimeoAuthId.set(wsUuid, timeoAuthId);
    counts.authUsers++;
    counts.timeoUsers++;
  }

  console.log(
    `  Created ${counts.authUsers} auth users, ${counts.timeoUsers} Timeo users`
  );
  console.log(
    `  Existing: ${counts.existingUsers}, Skipped: ${counts.skipped}`
  );

  // ── 3. Create tenant ──────────────────────────────────────────────────
  console.log("\n-- Creating tenant --");

  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);

  let tenantId: string;

  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    console.log(`  Existing tenant: ${TENANT_NAME} (${tenantId})`);
  } else {
    tenantId = generateId();
    const ownerId = wsToTimeoUserId.get(ownerWsId);
    if (!ownerId) {
      throw new Error("Owner user ID not found after user creation step");
    }

    await db.insert(tenants).values({
      id: tenantId,
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      owner_id: ownerId,
      plan: "pro",
      status: "active",
      settings: {
        timezone: "Asia/Kuala_Lumpur",
        businessHours: { open: "06:00", close: "23:00" },
        bookingBuffer: 15,
        autoConfirmBookings: false,
      },
      branding: {
        primaryColor: "#dc2626",
        businessName: "WS Fitness",
      },
      payment_gateway: "revenue_monster",
    });

    console.log(`  Created tenant: ${TENANT_NAME} (${tenantId})`);
  }

  // ── 4. Create tenant memberships (role assignments) ───────────────────
  console.log("\n-- Creating tenant memberships --");

  for (const profile of t.profiles.rows) {
    const wsUuid = profile.id;
    const timeoUserId = wsToTimeoUserId.get(wsUuid);
    if (!timeoUserId) continue;

    const wsRole = rolesByUuid.get(wsUuid) || "member";
    const wsMembership = membershipsByUuid.get(wsUuid);
    const timeoRole = mapWsRoleToTimeo(wsRole);
    const membershipStatus = wsMembership
      ? mapWsMembershipStatus(wsMembership.status)
      : "active";

    // Check if tenant membership already exists
    const existingTm = await db
      .select()
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, timeoUserId)
        )
      )
      .limit(1);

    if (existingTm.length > 0) continue;

    await db.insert(tenantMemberships).values({
      id: generateId(),
      user_id: timeoUserId,
      tenant_id: tenantId,
      role: timeoRole,
      status: membershipStatus,
      notes: wsMembership?.plan_type
        ? `WS Fitness plan: ${wsMembership.plan_type}`
        : `WS Fitness role: ${wsRole}`,
      tags: [wsRole],
      joined_at: new Date(profile.created_at),
    });

    counts.tenantMemberships++;
  }

  console.log(`  Created ${counts.tenantMemberships} tenant memberships`);

  // ── 5. Import membership plans ────────────────────────────────────────
  console.log("\n-- Importing membership plans --");

  const wsPlanToTimeoMembership = new Map<string, string>();
  const wsPlanNameToTimeoMembership = new Map<string, string>();

  for (const plan of t.membership_plans.rows) {
    const membershipId = generateId();
    const priceCents = rmToCents(plan.price);
    const interval = mapInterval(plan.duration_months || 1);

    const features: string[] = [];
    if (plan.description) {
      for (const line of plan.description.split("\n")) {
        const cleaned = line.replace(/^[*\-*]\s*/, "").trim();
        if (cleaned && !cleaned.startsWith("!")) features.push(cleaned);
      }
    }
    if (plan.sessions) features.push(`${plan.sessions} sessions`);
    if (plan.access_level) features.push(`Access: ${plan.access_level}`);
    if (features.length === 0) features.push(plan.title);

    await db.insert(memberships).values({
      id: membershipId,
      tenant_id: tenantId,
      name: plan.title,
      description: plan.description || plan.title,
      price: priceCents,
      currency: "MYR",
      interval: interval,
      features: features,
      is_active: plan.is_active ?? true,
      created_at: new Date(plan.created_at),
    });

    wsPlanToTimeoMembership.set(plan.id, membershipId);
    wsPlanNameToTimeoMembership.set(plan.title, membershipId);
    counts.membershipPlans++;
  }

  console.log(`  Created ${counts.membershipPlans} membership plans`);

  // ── 6. Create subscriptions from WS memberships ───────────────────────
  console.log("\n-- Creating subscriptions --");

  for (const m of t.memberships.rows) {
    const timeoUserId = wsToTimeoUserId.get(m.user_id);
    if (!timeoUserId) continue;
    if (m.status === "pending_approval" || m.status === "rejected") continue;

    // Match plan by exact name first
    let membershipId = wsPlanNameToTimeoMembership.get(m.plan_type);

    // Fuzzy match if exact name not found
    if (!membershipId) {
      for (const [name, id] of wsPlanNameToTimeoMembership) {
        const prefix = name.toLowerCase().substring(0, 10);
        if (
          m.plan_type &&
          prefix.length > 0 &&
          m.plan_type.toLowerCase().includes(prefix)
        ) {
          membershipId = id;
          break;
        }
      }
    }

    if (!membershipId) continue;

    const status = m.status === "active" ? ("active" as const) : ("canceled" as const);
    const validFrom = m.valid_from
      ? new Date(m.valid_from)
      : new Date(m.created_at);
    const expiryDate = m.expiry_date
      ? new Date(m.expiry_date)
      : new Date(validFrom.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(subscriptions).values({
      id: generateId(),
      tenant_id: tenantId,
      customer_id: timeoUserId,
      membership_id: membershipId,
      status: status,
      current_period_start: validFrom,
      current_period_end: expiryDate,
      cancel_at_period_end: m.status === "expired",
      created_at: new Date(m.created_at),
    });

    counts.subscriptions++;
  }

  console.log(`  Created ${counts.subscriptions} subscriptions`);

  // ── 7. Import QR codes ────────────────────────────────────────────────
  console.log("\n-- Importing QR codes --");

  for (const profile of t.profiles.rows) {
    if (!profile.qr_code_url) continue;

    const timeoUserId = wsToTimeoUserId.get(profile.id);
    if (!timeoUserId) continue;

    let qrCode: string;
    try {
      const qrData = JSON.parse(profile.qr_code_url);
      qrCode = qrData.id || profile.qr_code_url;
    } catch {
      qrCode = profile.qr_code_url;
    }

    await db.insert(memberQrCodes).values({
      id: generateId(),
      tenant_id: tenantId,
      user_id: timeoUserId,
      code: qrCode,
      is_active: true,
      created_at: new Date(profile.created_at),
    });

    counts.qrCodes++;
  }

  console.log(`  Created ${counts.qrCodes} QR codes`);

  // ── 8. Import check-ins (batched) ─────────────────────────────────────
  console.log("\n-- Importing check-ins --");

  counts.checkIns = await processBatches(
    t.check_ins.rows,
    BATCH_SIZE,
    async (batch) => {
      const values: (typeof checkIns.$inferInsert)[] = [];

      for (const ci of batch) {
        const timeoUserId = wsToTimeoUserId.get(ci.member_id);
        if (!timeoUserId) continue;

        values.push({
          id: generateId(),
          tenant_id: tenantId,
          user_id: timeoUserId,
          method: "manual" as const,
          timestamp: new Date(ci.checked_in_at),
        });
      }

      if (values.length > 0) {
        await db.insert(checkIns).values(values);
      }
      return values.length;
    },
    "Check-ins"
  );

  console.log(`  Created ${counts.checkIns} check-ins`);

  // ── 9. Import session packages ────────────────────────────────────────
  console.log("\n-- Importing session packages --");

  const packageTypeToId = new Map<string, string>();
  const seenPackageTypes = new Set<string>();

  for (const cl of t.clients.rows) {
    if (seenPackageTypes.has(cl.package_type)) continue;
    seenPackageTypes.add(cl.package_type);

    // Estimate price from related payment requests
    let price = 0;
    const relatedPayment = t.payment_requests.rows.find(
      (pr: any) =>
        pr.user_id === cl.member_id &&
        (pr.plan_type || "").toLowerCase().includes("coach")
    );
    if (relatedPayment) price = rmToCents(relatedPayment.amount);

    const pkgId = generateId();
    await db.insert(sessionPackages).values({
      id: pkgId,
      tenant_id: tenantId,
      name: `Coach Training ${cl.package_type}`,
      description: `Coaching package: ${cl.package_type} (${cl.total_sessions_purchased} sessions)`,
      session_count: cl.total_sessions_purchased,
      price: price,
      currency: "MYR",
      is_active: true,
    });

    packageTypeToId.set(cl.package_type, pkgId);
    counts.sessionPackages++;
  }

  console.log(`  Created ${counts.sessionPackages} session packages`);

  // ── 10. Import session credits ────────────────────────────────────────
  console.log("\n-- Importing session credits --");

  const wsClientToTimeoCredit = new Map<string, string>();

  for (const cl of t.clients.rows) {
    const timeoUserId = cl.member_id
      ? wsToTimeoUserId.get(cl.member_id)
      : null;
    if (!timeoUserId) continue;

    const packageId = packageTypeToId.get(cl.package_type);
    if (!packageId) continue;

    // Count used sessions from training logs
    const usedSessions = t.training_logs.rows.filter(
      (tl: any) => tl.client_id === cl.id
    ).length;

    const creditId = generateId();
    await db.insert(sessionCredits).values({
      id: creditId,
      tenant_id: tenantId,
      user_id: timeoUserId,
      package_id: packageId,
      total_sessions:
        cl.total_sessions_purchased + (cl.carry_over_sessions || 0),
      used_sessions: usedSessions,
      expires_at: cl.expiry_date ? new Date(cl.expiry_date) : null,
      purchased_at: new Date(cl.created_at),
    });

    wsClientToTimeoCredit.set(cl.id, creditId);
    counts.sessionCredits++;
  }

  console.log(`  Created ${counts.sessionCredits} session credits`);

  // ── 11. Import training logs as session logs (batched) ────────────────
  console.log("\n-- Importing training logs --");

  counts.sessionLogs = await processBatches(
    t.training_logs.rows,
    BATCH_SIZE,
    async (batch) => {
      const values: (typeof sessionLogs.$inferInsert)[] = [];

      for (const tl of batch) {
        const clientRecord = clientById.get(tl.client_id);
        const clientUserId = clientRecord?.member_id
          ? wsToTimeoUserId.get(clientRecord.member_id)
          : null;
        const coachUserId = wsToTimeoUserId.get(tl.coach_id);

        if (!clientUserId || !coachUserId) continue;

        const creditId = wsClientToTimeoCredit.get(tl.client_id) || null;

        let sessionType:
          | "personal_training"
          | "group_class"
          | "assessment"
          | "consultation" = "personal_training";
        if (tl.training_type === "group") sessionType = "group_class";
        if (tl.training_type === "assessment") sessionType = "assessment";

        values.push({
          id: generateId(),
          tenant_id: tenantId,
          client_id: clientUserId,
          coach_id: coachUserId,
          credit_id: creditId,
          session_type: sessionType,
          notes: tl.notes || null,
          exercises: tl.exercises || [],
          metrics: tl.weight_kg ? { weight_kg: tl.weight_kg } : null,
          created_at: new Date(tl.date || tl.created_at),
        });
      }

      if (values.length > 0) {
        await db.insert(sessionLogs).values(values);
      }
      return values.length;
    },
    "Training logs"
  );

  console.log(`  Created ${counts.sessionLogs} session logs`);

  // ── 12. Import payment requests ───────────────────────────────────────
  console.log("\n-- Importing payment records --");

  for (const pr of t.payment_requests.rows) {
    const timeoUserId = wsToTimeoUserId.get(pr.user_id);
    if (!timeoUserId) continue;

    const status =
      pr.status === "approved"
        ? ("succeeded" as const)
        : pr.status === "pending"
          ? ("pending" as const)
          : ("failed" as const);

    await db.insert(payments).values({
      id: generateId(),
      tenant_id: tenantId,
      customer_id: timeoUserId,
      amount: rmToCents(pr.amount),
      currency: "MYR",
      status: status,
      metadata: {
        ws_order_id: pr.order_id,
        ws_plan_type: pr.plan_type,
        ws_receipt_url: pr.receipt_url,
        ws_payer_name: pr.payer_name,
        ws_notes: pr.notes,
        migrated_from: "ws-fitness-lovable",
      },
      created_at: new Date(pr.payment_date || pr.created_at),
    });

    counts.payments++;
  }

  console.log(`  Created ${counts.payments} payment records`);

  // ── 13. Import turnstile devices ──────────────────────────────────────
  console.log("\n-- Importing turnstile devices --");

  // Map: WS device_sn -> already tracked (to avoid duplicates across tables)
  const deviceSnSet = new Set<string>();

  for (const device of t.turnstile_face_devices.rows) {
    if (deviceSnSet.has(device.device_sn)) continue;
    deviceSnSet.add(device.device_sn);

    // Check if device already exists
    const existingDevice = await db
      .select()
      .from(turnstileDevices)
      .where(eq(turnstileDevices.device_sn, device.device_sn))
      .limit(1);

    if (existingDevice.length > 0) {
      console.log(
        `  Existing device: ${device.name} (${device.device_sn})`
      );
      continue;
    }

    await db.insert(turnstileDevices).values({
      id: generateId(),
      tenant_id: tenantId,
      device_sn: device.device_sn,
      name: device.name || "Turnstile",
      mqtt_topic: null,
      http_push_url: null,
      match_mode: "offline_fallback" as const,
      status: device.is_active ? ("active" as const) : ("inactive" as const),
      config: {
        device_type: device.device_type || null,
        device_no: device.device_no || null,
        addr_no: device.addr_no || null,
        addr_name: device.addr_name || null,
        ws_device_id: device.id,
        migrated_from: "ws-fitness-lovable",
      },
      created_at: new Date(device.created_at),
    });

    counts.turnstileDevices++;
  }

  console.log(`  Created ${counts.turnstileDevices} turnstile devices`);

  // ── 14. Import turnstile face logs as access logs (batched) ───────────
  console.log("\n-- Importing access logs (from turnstile face logs) --");

  counts.accessLogs = await processBatches(
    t.turnstile_face_logs.rows,
    BATCH_SIZE,
    async (batch) => {
      const values: (typeof accessLogs.$inferInsert)[] = [];

      for (const fl of batch) {
        // Map user_id if present (some face logs have user_id linked)
        const timeoUserId = fl.user_id
          ? wsToTimeoUserId.get(fl.user_id) || null
          : null;

        const matchScore = extractMatchScore(fl.raw_payload);
        const matchResult = mapAccessResult(fl.decision);

        const denyReason =
          matchResult === "denied" || matchResult === "stranger"
            ? fl.reason || null
            : null;

        values.push({
          id: generateId(),
          tenant_id: tenantId,
          device_sn: fl.device_sn,
          user_id: timeoUserId,
          person_id_from_device: fl.person_id || null,
          match_score: matchScore,
          match_result: matchResult,
          deny_reason: denyReason,
          method: "face" as const,
          device_raw_data: fl.raw_payload || null,
          sequence_no: fl.raw_payload?.sequence_no || null,
          cap_time: fl.cap_time || null,
          created_at: new Date(fl.created_at),
        });
      }

      if (values.length > 0) {
        await db.insert(accessLogs).values(values);
      }
      return values.length;
    },
    "Access logs"
  );

  console.log(`  Created ${counts.accessLogs} access logs`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n======================================================");
  console.log("  Migration Complete");
  console.log("======================================================");
  console.log(`  Tenant:              ${TENANT_NAME} (${tenantId})`);
  console.log(`  Auth users:          ${counts.authUsers}`);
  console.log(`  Timeo users:         ${counts.timeoUsers}`);
  console.log(`  Existing users:      ${counts.existingUsers}`);
  console.log(`  Tenant memberships:  ${counts.tenantMemberships}`);
  console.log(`  Membership plans:    ${counts.membershipPlans}`);
  console.log(`  Subscriptions:       ${counts.subscriptions}`);
  console.log(`  QR codes:            ${counts.qrCodes}`);
  console.log(`  Check-ins:           ${counts.checkIns}`);
  console.log(`  Session packages:    ${counts.sessionPackages}`);
  console.log(`  Session credits:     ${counts.sessionCredits}`);
  console.log(`  Session logs:        ${counts.sessionLogs}`);
  console.log(`  Payments:            ${counts.payments}`);
  console.log(`  Turnstile devices:   ${counts.turnstileDevices}`);
  console.log(`  Access logs:         ${counts.accessLogs}`);
  console.log(`  Skipped users:       ${counts.skipped}`);
  console.log("======================================================");

  console.log(
    "\nIMPORTANT: Password hashes could not be exported from Supabase."
  );
  console.log(
    "All migrated users have force_password_reset=true and must use"
  );
  console.log(
    "'Forgot Password' to set a new password."
  );
  console.log(
    "Send a bulk password-reset email once SMTP is verified.\n"
  );

  await client.end();
}

// ─── Dry-run plan printer ───────────────────────────────────────────────────

function printMigrationPlan(data: ExportData) {
  const t = data.tables;

  // Count roles
  const roleCounts: Record<string, number> = {};
  for (const r of t.user_roles.rows) {
    roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
  }

  // Count membership statuses
  const statusCounts: Record<string, number> = {};
  for (const m of t.memberships.rows) {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
  }

  // Count profiles with QR codes / NFC / missing email
  const qrCount = t.profiles.rows.filter((p: any) => p.qr_code_url).length;
  const nfcCount = t.profiles.rows.filter((p: any) => p.nfc_card_id).length;
  const noEmail = t.profiles.rows.filter(
    (p: any) => !(p.email || "").trim()
  ).length;

  // Turnstile face log decisions
  const decisionCounts: Record<string, number> = {};
  for (const fl of t.turnstile_face_logs.rows) {
    const d = fl.decision || "unknown";
    decisionCounts[d] = (decisionCounts[d] || 0) + 1;
  }

  // Turnstile event types (for info)
  const cmdCounts: Record<string, number> = {};
  for (const ev of t.turnstile_events.rows) {
    cmdCounts[ev.cmd] = (cmdCounts[ev.cmd] || 0) + 1;
  }

  console.log("\n  WS Fitness Data Mapping Plan:");
  console.log("  -----------------------------------------------");
  console.log(
    `  Profiles -> users + tenantMemberships: ${t.profiles.row_count}`
  );
  console.log(`    Without email (will skip): ${noEmail}`);
  console.log(`    With QR codes: ${qrCount}`);
  console.log(`    With NFC cards: ${nfcCount}`);
  console.log("");

  console.log("  Role breakdown:");
  for (const [role, count] of Object.entries(roleCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    const timeoRole = mapWsRoleToTimeo(role);
    console.log(`    ${role} -> ${timeoRole}: ${count}`);
  }
  console.log("");

  console.log("  Membership status breakdown:");
  for (const [status, count] of Object.entries(statusCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    const timeoStatus = mapWsMembershipStatus(status);
    console.log(`    ${status} -> ${timeoStatus}: ${count}`);
  }
  console.log("");

  console.log(
    `  Membership plans -> memberships: ${t.membership_plans.row_count}`
  );
  console.log(
    `  WS memberships -> subscriptions: ~${t.memberships.row_count}`
  );
  console.log(`  Check-ins -> check_ins: ${t.check_ins.row_count}`);
  console.log(`  Clients -> session_credits: ${t.clients.row_count}`);
  console.log(
    `  Training logs -> session_logs: ${t.training_logs.row_count}`
  );
  console.log(
    `  Payment requests -> payments: ${t.payment_requests.row_count}`
  );
  console.log("");

  console.log(
    `  Turnstile devices -> turnstile_devices: ${t.turnstile_face_devices.row_count}`
  );
  console.log(
    `  Turnstile face logs -> access_logs: ${t.turnstile_face_logs.row_count}`
  );
  console.log("    Face log decisions:");
  for (const [decision, count] of Object.entries(decisionCounts)) {
    const mapped = mapAccessResult(decision);
    console.log(`      ${decision} -> ${mapped}: ${count}`);
  }
  console.log("");

  console.log(
    `  Turnstile events: ${t.turnstile_events.row_count} (NOT migrated -- device heartbeats)`
  );
  console.log("    Event types:");
  for (const [cmd, count] of Object.entries(cmdCounts)) {
    console.log(`      ${cmd}: ${count}`);
  }
  console.log("");

  console.log(
    "  NOTE: All 14,421 turnstile_events are device heartbeats (no access data)."
  );
  console.log(
    "  Actual face access data is in turnstile_face_logs (359 rows) -> access_logs."
  );
  console.log(
    "  Users will have force_password_reset=true (no Supabase password hashes)."
  );
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
