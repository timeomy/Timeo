/**
 * WS Fitness → Timeo Migration Script
 *
 * Reads the full Lovable/Supabase JSON export and imports into Timeo's
 * PostgreSQL database via Drizzle ORM.
 *
 * Usage:
 *   npx tsx scripts/migrate-wsfitness.ts [--dry-run]
 *
 * Prerequisites:
 *   - PostgreSQL running with Timeo schema migrated
 *   - .env with DATABASE_URL set
 *   - Export file at the path specified by EXPORT_FILE below
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Load .env ──────────────────────────────────────────────────────────────
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";

// Drizzle schema imports
import { users, tenants, tenantMemberships } from "../packages/db/src/schema/core";
import { user as authUser, account as authAccount } from "../packages/db/src/schema/auth";
import { checkIns, memberQrCodes, sessionPackages, sessionCredits, sessionLogs } from "../packages/db/src/schema/fitness";
import { memberships } from "../packages/db/src/schema/commerce";
import { subscriptions, payments } from "../packages/db/src/schema/payments";
import { generateId } from "../packages/db/src/id";

// ─── Config ─────────────────────────────────────────────────────────────────

const EXPORT_FILE = process.env.EXPORT_FILE
  || "/Users/jabez/timeo/wsfitness/wsfitness_full_export_2026-03-06.json";

const DRY_RUN = process.argv.includes("--dry-run");
const TENANT_NAME = "WS Fitness";
const TENANT_SLUG = "ws-fitness";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExportData {
  exported_at: string;
  exported_by: string;
  supabase_project_id: string;
  tables: Record<string, { row_count: number; rows: any[] }>;
  auth_users: { row_count: number; note: string; rows: any[] };
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

function mapWsMembershipStatus(wsStatus: string): "active" | "invited" | "suspended" {
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

/**
 * Map WS Fitness membership plan duration to Timeo's interval enum.
 * Timeo only has "monthly" | "yearly".
 * We map based on duration_months.
 */
function mapInterval(durationMonths: number): "monthly" | "yearly" {
  return durationMonths >= 12 ? "yearly" : "monthly";
}

/**
 * Convert RM price (whole number) to cents for Timeo.
 * WS Fitness stores prices in RM (e.g., 388 = RM388), Timeo stores in cents (e.g., 38800).
 */
function rmToCents(rmPrice: number): number {
  return Math.round(rmPrice * 100);
}

/**
 * Map WS Fitness check-in method to Timeo's checkInMethodEnum.
 * WS Fitness check_ins don't have explicit method, but we can infer from turnstile_events.
 */
function inferCheckInMethod(_checkIn: any): "qr" | "nfc" | "manual" | "face" {
  return "manual"; // Default — WS check_ins don't store method
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  WS Fitness → Timeo Migration                   ║");
  console.log("╚══════════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("\n⚠️  DRY RUN — no data will be written\n");

  // ── Load export ─────────────────────────────────────────────────────────
  console.log(`Loading export from ${EXPORT_FILE}...`);
  const raw = fs.readFileSync(EXPORT_FILE, "utf-8");
  const data: ExportData = JSON.parse(raw);

  const t = data.tables;
  console.log(`  Exported at: ${data.exported_at}`);
  console.log(`  Profiles: ${t.profiles.row_count}`);
  console.log(`  Auth users: ${data.auth_users.row_count}`);
  console.log(`  Membership plans: ${t.membership_plans.row_count}`);
  console.log(`  Memberships: ${t.memberships.row_count}`);
  console.log(`  Check-ins: ${t.check_ins.row_count}`);
  console.log(`  Turnstile events: ${t.turnstile_events.row_count}`);
  console.log(`  Clients: ${t.clients.row_count}`);
  console.log(`  Training logs: ${t.training_logs.row_count}`);
  console.log(`  Payment requests: ${t.payment_requests.row_count}`);
  console.log(`  User roles: ${t.user_roles.row_count}`);

  // ── Connect to DB ───────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set in .env");
  }

  console.log("\nConnecting to database...");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  if (DRY_RUN) {
    console.log("DRY RUN — skipping database operations. Showing migration plan:\n");
    printMigrationPlan(data);
    await pool.end();
    return;
  }

  // ── Build lookup maps ───────────────────────────────────────────────────

  // Map: WS Supabase user UUID → profile data
  const profilesByUuid = new Map<string, any>();
  for (const p of t.profiles.rows) {
    profilesByUuid.set(p.id, p);
  }

  // Map: WS Supabase user UUID → role
  const rolesByUuid = new Map<string, string>();
  for (const r of t.user_roles.rows) {
    rolesByUuid.set(r.user_id, r.role);
  }

  // Map: WS Supabase user UUID → membership
  const membershipsByUuid = new Map<string, any>();
  for (const m of t.memberships.rows) {
    membershipsByUuid.set(m.user_id, m);
  }

  // Map: WS Supabase user UUID → auth user
  const authUsersByUuid = new Map<string, any>();
  for (const au of data.auth_users.rows) {
    authUsersByUuid.set(au.id, au);
  }

  // ── 1. Create (or find) the WS Fitness tenant owner ─────────────────────
  // We'll use the first admin user as the tenant owner
  const adminRoles = t.user_roles.rows.filter((r: any) => r.role === "admin");
  if (adminRoles.length === 0) throw new Error("No admin user found in export");
  const ownerWsId = adminRoles[0].user_id;
  const ownerProfile = profilesByUuid.get(ownerWsId);
  const ownerAuth = authUsersByUuid.get(ownerWsId);
  if (!ownerProfile || !ownerAuth) throw new Error("Owner profile/auth not found");

  console.log(`\nTenant owner: ${ownerProfile.name} (${ownerProfile.email})`);

  // ── 2. Create tenant owner in Timeo auth system ─────────────────────────
  // Map: WS UUID → Timeo user ID
  const wsToTimeoUserId = new Map<string, string>();
  const wsToTimeoAuthId = new Map<string, string>();

  const counts = {
    authUsers: 0,
    timeoUsers: 0,
    tenantMemberships: 0,
    membershipPlans: 0,
    subscriptions: 0,
    checkIns: 0,
    qrCodes: 0,
    sessionPackages: 0,
    sessionCredits: 0,
    sessionLogs: 0,
    payments: 0,
    skipped: 0,
  };

  // ── 3. Batch-create all users ───────────────────────────────────────────
  console.log("\n── Creating users ──────────────────────────────────");

  for (const profile of t.profiles.rows) {
    const wsUuid = profile.id;
    const authData = authUsersByUuid.get(wsUuid);
    const email = profile.email?.trim().toLowerCase();

    if (!email) {
      console.log(`  ⚠ Skipping user without email: ${profile.name} (${wsUuid})`);
      counts.skipped++;
      continue;
    }

    // Check if user already exists in Timeo (by email)
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let timeoAuthId: string;
    let timeoUserId: string;

    if (existing.length > 0) {
      // User already exists — reuse IDs
      timeoUserId = existing[0].id;
      timeoAuthId = existing[0].auth_id || "";
      console.log(`  ↩ Existing: ${profile.name} (${email})`);
    } else {
      // Create new Better Auth user
      timeoAuthId = generateId();
      timeoUserId = generateId();
      const accountId = generateId();

      await db.insert(authUser).values({
        id: timeoAuthId,
        name: profile.name || email.split("@")[0],
        email: email,
        emailVerified: !!authData?.email_confirmed_at,
      });

      // Create credential account (no password — users must reset)
      await db.insert(authAccount).values({
        id: accountId,
        accountId: timeoAuthId,
        providerId: "credential",
        userId: timeoAuthId,
        password: null, // No password hash available from Supabase export
      });

      // Create Timeo user
      await db.insert(users).values({
        id: timeoUserId,
        auth_id: timeoAuthId,
        email: email,
        name: profile.name || email.split("@")[0],
        avatar_url: profile.avatar_url || null,
        created_at: new Date(profile.created_at),
      });

      counts.authUsers++;
      counts.timeoUsers++;
    }

    wsToTimeoUserId.set(wsUuid, timeoUserId);
    wsToTimeoAuthId.set(wsUuid, timeoAuthId);
  }

  console.log(`  ✓ Created ${counts.authUsers} auth users, ${counts.timeoUsers} Timeo users`);
  console.log(`  ⚠ Skipped ${counts.skipped} users`);

  // ── 4. Create tenant ──────────────────────────────────────────────────
  console.log("\n── Creating tenant ─────────────────────────────────");

  // Check if WS Fitness tenant already exists
  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);

  let tenantId: string;

  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    console.log(`  ↩ Tenant already exists: ${TENANT_NAME} (${tenantId})`);
  } else {
    tenantId = generateId();
    const ownerId = wsToTimeoUserId.get(ownerWsId)!;

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

    console.log(`  ✓ Created tenant: ${TENANT_NAME} (${tenantId})`);
  }

  // ── 5. Create tenant memberships (role assignments) ───────────────────
  console.log("\n── Creating tenant memberships ─────────────────────");

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

    // Check if already exists
    const existingTm = await db
      .select()
      .from(tenantMemberships)
      .where(eq(tenantMemberships.user_id, timeoUserId))
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

  console.log(`  ✓ Created ${counts.tenantMemberships} tenant memberships`);

  // ── 6. Import membership plans ────────────────────────────────────────
  console.log("\n── Importing membership plans ──────────────────────");

  // Map: WS plan ID → Timeo membership ID
  const wsPlanToTimeoMembership = new Map<string, string>();
  // Map: WS plan title → Timeo membership ID (for matching by name)
  const wsPlanNameToTimeoMembership = new Map<string, string>();

  for (const plan of t.membership_plans.rows) {
    const membershipId = generateId();
    const priceCents = rmToCents(plan.price);
    const interval = mapInterval(plan.duration_months || 1);

    // Build features list from description
    const features: string[] = [];
    if (plan.description) {
      const lines = plan.description.split("\n");
      for (const line of lines) {
        const cleaned = line.replace(/^[•\-\*]\s*/, "").trim();
        if (cleaned && !cleaned.startsWith("⚠")) features.push(cleaned);
      }
    }
    if (plan.sessions) features.push(`${plan.sessions} sessions`);
    if (plan.access_level) features.push(`Access: ${plan.access_level}`);

    await db.insert(memberships).values({
      id: membershipId,
      tenant_id: tenantId,
      name: plan.title,
      description: plan.description || plan.title,
      price: priceCents,
      currency: "MYR",
      interval: interval,
      features: features.length > 0 ? features : [plan.title],
      is_active: plan.is_active ?? true,
      created_at: new Date(plan.created_at),
    });

    wsPlanToTimeoMembership.set(plan.id, membershipId);
    wsPlanNameToTimeoMembership.set(plan.title, membershipId);
    counts.membershipPlans++;
  }

  console.log(`  ✓ Created ${counts.membershipPlans} membership plans`);

  // ── 7. Create subscriptions from WS memberships ──────────────────────
  console.log("\n── Creating subscriptions ──────────────────────────");

  for (const m of t.memberships.rows) {
    const timeoUserId = wsToTimeoUserId.get(m.user_id);
    if (!timeoUserId) continue;
    if (m.status === "pending_approval" || m.status === "rejected") continue;

    // Try to match plan by name
    let membershipId = wsPlanNameToTimeoMembership.get(m.plan_type);
    if (!membershipId) {
      // Fuzzy match — find closest plan name
      for (const [name, id] of wsPlanNameToTimeoMembership) {
        if (m.plan_type?.toLowerCase().includes(name.toLowerCase().substring(0, 10))) {
          membershipId = id;
          break;
        }
      }
    }

    if (!membershipId) {
      // Skip memberships we can't map (Pending, Staff, etc.)
      continue;
    }

    const status = m.status === "active" ? "active" : "canceled";
    const validFrom = m.valid_from ? new Date(m.valid_from) : new Date(m.created_at);
    const expiryDate = m.expiry_date
      ? new Date(m.expiry_date)
      : new Date(validFrom.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

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

  console.log(`  ✓ Created ${counts.subscriptions} subscriptions`);

  // ── 8. Import QR codes ────────────────────────────────────────────────
  console.log("\n── Importing QR codes ──────────────────────────────");

  for (const profile of t.profiles.rows) {
    if (!profile.qr_code_url) continue;

    const timeoUserId = wsToTimeoUserId.get(profile.id);
    if (!timeoUserId) continue;

    // QR code data is stored as JSON string in qr_code_url
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

  console.log(`  ✓ Created ${counts.qrCodes} QR codes`);

  // ── 9. Import check-ins ───────────────────────────────────────────────
  console.log("\n── Importing check-ins ─────────────────────────────");

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 100;
  const checkInRows = t.check_ins.rows;

  for (let i = 0; i < checkInRows.length; i += BATCH_SIZE) {
    const batch = checkInRows.slice(i, i + BATCH_SIZE);
    const values: any[] = [];

    for (const ci of batch) {
      const timeoUserId = wsToTimeoUserId.get(ci.member_id);
      if (!timeoUserId) continue;

      values.push({
        id: generateId(),
        tenant_id: tenantId,
        user_id: timeoUserId,
        method: inferCheckInMethod(ci) as "qr" | "nfc" | "manual" | "face",
        timestamp: new Date(ci.checked_in_at),
      });
    }

    if (values.length > 0) {
      await db.insert(checkIns).values(values);
      counts.checkIns += values.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= checkInRows.length) {
      process.stdout.write(`\r  Imported ${counts.checkIns} / ${checkInRows.length} check-ins`);
    }
  }

  console.log(`\n  ✓ Created ${counts.checkIns} check-ins`);

  // ── 10. Import session packages (from coaching package types) ─────────
  console.log("\n── Importing session packages ──────────────────────");

  // Extract unique package types from clients table
  const packageTypes = new Map<string, { count: number; price: number }>();
  for (const client of t.clients.rows) {
    if (!packageTypes.has(client.package_type)) {
      // Estimate price from payment_requests for this package type
      const relatedPayment = t.payment_requests.rows.find(
        (pr: any) =>
          pr.user_id === client.member_id &&
          pr.plan_type?.toLowerCase().includes("coach")
      );
      const price = relatedPayment ? rmToCents(relatedPayment.amount) : 0;

      packageTypes.set(client.package_type, {
        count: client.total_sessions_purchased,
        price: price,
      });
    }
  }

  // Map: package_type string → Timeo session package ID
  const packageTypeToId = new Map<string, string>();

  for (const [pkgType, info] of packageTypes) {
    const pkgId = generateId();
    await db.insert(sessionPackages).values({
      id: pkgId,
      tenant_id: tenantId,
      name: `Coach Training ${pkgType}`,
      description: `Coaching package: ${pkgType} (${info.count} sessions)`,
      session_count: info.count,
      price: info.price,
      currency: "MYR",
      is_active: true,
    });

    packageTypeToId.set(pkgType, pkgId);
    counts.sessionPackages++;
  }

  console.log(`  ✓ Created ${counts.sessionPackages} session packages`);

  // ── 11. Import session credits from clients ───────────────────────────
  console.log("\n── Importing session credits ───────────────────────");

  // Map: WS client ID → Timeo session credit ID (for training logs)
  const wsClientToTimeoCredit = new Map<string, string>();

  for (const client of t.clients.rows) {
    // Try to find the Timeo user for this client
    // clients have a member_id that links to profiles.id
    const timeoUserId = client.member_id
      ? wsToTimeoUserId.get(client.member_id)
      : null;

    if (!timeoUserId) continue;

    const packageId = packageTypeToId.get(client.package_type);
    if (!packageId) continue;

    // Calculate used sessions from training logs
    const usedSessions = t.training_logs.rows.filter(
      (tl: any) => tl.client_id === client.id
    ).length;

    const creditId = generateId();
    await db.insert(sessionCredits).values({
      id: creditId,
      tenant_id: tenantId,
      user_id: timeoUserId,
      package_id: packageId,
      total_sessions: client.total_sessions_purchased + (client.carry_over_sessions || 0),
      used_sessions: usedSessions,
      expires_at: client.expiry_date ? new Date(client.expiry_date) : null,
      purchased_at: new Date(client.created_at),
    });

    wsClientToTimeoCredit.set(client.id, creditId);
    counts.sessionCredits++;
  }

  console.log(`  ✓ Created ${counts.sessionCredits} session credits`);

  // ── 12. Import training logs as session logs ──────────────────────────
  console.log("\n── Importing training logs ─────────────────────────");

  const trainingRows = t.training_logs.rows;
  for (let i = 0; i < trainingRows.length; i += BATCH_SIZE) {
    const batch = trainingRows.slice(i, i + BATCH_SIZE);
    const values: any[] = [];

    for (const tl of batch) {
      // client_id in training_logs refers to the clients table ID, not a user UUID
      const creditId = wsClientToTimeoCredit.get(tl.client_id);

      // Find the client record to get the member_id (user UUID)
      const clientRecord = t.clients.rows.find((c: any) => c.id === tl.client_id);
      const clientUserId = clientRecord?.member_id
        ? wsToTimeoUserId.get(clientRecord.member_id)
        : null;

      // Coach ID
      const coachUserId = wsToTimeoUserId.get(tl.coach_id);

      if (!clientUserId || !coachUserId) continue;

      // Map training_type
      let sessionType: "personal_training" | "group_class" | "assessment" | "consultation" =
        "personal_training";
      if (tl.training_type === "group") sessionType = "group_class";
      if (tl.training_type === "assessment") sessionType = "assessment";

      values.push({
        id: generateId(),
        tenant_id: tenantId,
        client_id: clientUserId,
        coach_id: coachUserId,
        credit_id: creditId || null,
        session_type: sessionType,
        notes: tl.notes || null,
        exercises: tl.exercises || [],
        metrics: tl.weight_kg ? { weight_kg: tl.weight_kg } : null,
        created_at: new Date(tl.date || tl.created_at),
      });
    }

    if (values.length > 0) {
      await db.insert(sessionLogs).values(values);
      counts.sessionLogs += values.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= trainingRows.length) {
      process.stdout.write(`\r  Imported ${counts.sessionLogs} / ${trainingRows.length} training logs`);
    }
  }

  console.log(`\n  ✓ Created ${counts.sessionLogs} session logs`);

  // ── 13. Import payment requests as payments ───────────────────────────
  console.log("\n── Importing payment records ───────────────────────");

  for (const pr of t.payment_requests.rows) {
    const timeoUserId = wsToTimeoUserId.get(pr.user_id);
    if (!timeoUserId) continue;

    const status = pr.status === "approved" ? "succeeded" as const
      : pr.status === "pending" ? "pending" as const
      : "failed" as const;

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

  console.log(`  ✓ Created ${counts.payments} payment records`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Migration Complete                              ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Tenant: ${TENANT_NAME.padEnd(39)} ║`);
  console.log(`║  Auth users:          ${String(counts.authUsers).padStart(6)}                  ║`);
  console.log(`║  Timeo users:         ${String(counts.timeoUsers).padStart(6)}                  ║`);
  console.log(`║  Tenant memberships:  ${String(counts.tenantMemberships).padStart(6)}                  ║`);
  console.log(`║  Membership plans:    ${String(counts.membershipPlans).padStart(6)}                  ║`);
  console.log(`║  Subscriptions:       ${String(counts.subscriptions).padStart(6)}                  ║`);
  console.log(`║  QR codes:            ${String(counts.qrCodes).padStart(6)}                  ║`);
  console.log(`║  Check-ins:           ${String(counts.checkIns).padStart(6)}                  ║`);
  console.log(`║  Session packages:    ${String(counts.sessionPackages).padStart(6)}                  ║`);
  console.log(`║  Session credits:     ${String(counts.sessionCredits).padStart(6)}                  ║`);
  console.log(`║  Session logs:        ${String(counts.sessionLogs).padStart(6)}                  ║`);
  console.log(`║  Payments:            ${String(counts.payments).padStart(6)}                  ║`);
  console.log(`║  Skipped users:       ${String(counts.skipped).padStart(6)}                  ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  console.log("\n⚠️  IMPORTANT: Password hashes could not be exported from Supabase.");
  console.log("   All migrated users will need to use 'Forgot Password' to set a new password.");
  console.log("   Send a bulk password-reset email once SMTP is verified.\n");

  await pool.end();
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

  // Count profiles with QR codes
  const qrCount = t.profiles.rows.filter((p: any) => p.qr_code_url).length;

  // Count profiles with NFC cards
  const nfcCount = t.profiles.rows.filter((p: any) => p.nfc_card_id).length;

  // Count profiles without email
  const noEmail = t.profiles.rows.filter((p: any) => !p.email?.trim()).length;

  console.log("  WS Fitness Data Mapping Plan:");
  console.log("  ─────────────────────────────────────────────────");
  console.log(`  Profiles → users + tenantMemberships: ${t.profiles.row_count}`);
  console.log(`    Without email (will skip): ${noEmail}`);
  console.log(`    With QR codes: ${qrCount}`);
  console.log(`    With NFC cards: ${nfcCount}`);
  console.log("");
  console.log("  Role breakdown:");
  for (const [role, count] of Object.entries(roleCounts).sort((a, b) => b[1] - a[1])) {
    const timeoRole = mapWsRoleToTimeo(role);
    console.log(`    ${role} → ${timeoRole}: ${count}`);
  }
  console.log("");
  console.log("  Membership status breakdown:");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    const timeoStatus = mapWsMembershipStatus(status);
    console.log(`    ${status} → ${timeoStatus}: ${count}`);
  }
  console.log("");
  console.log(`  Membership plans → memberships: ${t.membership_plans.row_count}`);
  console.log(`  WS memberships → subscriptions: ~${t.memberships.row_count}`);
  console.log(`  Check-ins → check_ins: ${t.check_ins.row_count}`);
  console.log(`  Clients → session_credits: ${t.clients.row_count}`);
  console.log(`  Training logs → session_logs: ${t.training_logs.row_count}`);
  console.log(`  Payment requests → payments: ${t.payment_requests.row_count}`);
  console.log(`  Turnstile events: ${t.turnstile_events.row_count} (NOT migrated — raw device data)`);
  console.log("");
  console.log("  NOTE: Turnstile events are raw device heartbeat/face-match logs.");
  console.log("  They're not migrated as-is. Check-ins cover the door access history.");
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
