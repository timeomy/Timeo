/**
 * WS Fitness Data Migration Script
 *
 * Reads exported JSON files and imports into Timeo via Convex internal mutations.
 *
 * Usage:
 *   npx tsx scripts/migrate-wsfitness.ts
 *
 * Prerequisites:
 *   - Convex dev server running (npx convex dev)
 *   - JSON export files in /Users/jabez/Downloads/wsfitnessmk2/
 */

import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../packages/api/convex/_generated/api";
import fs from "fs";
import path from "path";

const CONVEX_URL = process.env.CONVEX_URL || "https://mild-gnat-567.convex.cloud";
const DATA_DIR = "/Users/jabez/Downloads/wsfitnessmk2";

const client = new ConvexHttpClient(CONVEX_URL);

async function loadJson(filename: string) {
  const filepath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(raw);
}

async function main() {
  console.log("=== WS Fitness Migration ===\n");

  // Note: Internal mutations can't be called from HTTP client.
  // This script documents the migration data structure.
  // Run via: npx convex run seed:seedWsFitness
  // Then: npx convex run seed:importMembershipPlans
  // etc.

  // ─── Load data ──────────────────────────────────────────────────────

  console.log("Loading export files...");

  const usersData = await loadJson("full_user_migration_export_2026-02-20.json");
  const plansData = await loadJson("membership_plans_export_2026-02-20.json");
  const clientsData = await loadJson("clients_export_2026-02-20.json");
  const coachesData = await loadJson("coaches_export_2026-02-20.json");
  const billingData = await loadJson("billing-export_20260220-1416.json");

  console.log(`  Users: ${usersData.total_users}`);
  console.log(`  Plans: ${plansData.total_plans}`);
  console.log(`  Clients: ${clientsData.total_clients}`);
  console.log(`  Coaches: ${coachesData.total_coaches}`);
  console.log(`  Billing records: ${billingData.length}`);

  // ─── Prepare membership plans ───────────────────────────────────────

  console.log("\n--- Membership Plans ---");
  const plans = plansData.plans.map((p: any) => ({
    name: p.plan_name,
    description: p.description || "",
    priceRm: p.price_rm,
    durationMonths: p.duration_months,
    durationDays: p.duration_days,
    totalDays: p.total_days,
    accessType: p.access_type,
    isActive: p.is_active === "Yes",
  }));

  for (const p of plans) {
    console.log(`  ${p.name} — RM${p.priceRm} (${p.totalDays} days, ${p.accessType})`);
  }

  // ─── Prepare coaches ────────────────────────────────────────────────

  console.log("\n--- Coaches ---");
  const coaches = coachesData.coaches.map((c: any) => ({
    name: c.name,
    email: c.email,
    phone: c.phone || undefined,
  }));

  for (const c of coaches) {
    console.log(`  ${c.name} (${c.email})`);
  }

  // ─── Prepare members ────────────────────────────────────────────────

  console.log("\n--- Members ---");
  const members = usersData.users.map((u: any) => ({
    name: u.name,
    email: u.email,
    phone: u.phone_number || undefined,
    avatarUrl: u.avatar_url || undefined,
    role: u.role,
    legacyId: u.legacy_id || undefined,
    nfcCardId: u.nfc_card_id || undefined,
    membershipStatus: u.membership_status,
    planType: u.plan_type || undefined,
    expiryDate: u.expiry_date || undefined,
    waiverSignedAt: u.waiver_signed_at || undefined,
  }));

  const statusCounts: Record<string, number> = {};
  for (const m of members) {
    statusCounts[m.membershipStatus] = (statusCounts[m.membershipStatus] || 0) + 1;
  }
  console.log("  Status breakdown:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  // ─── Prepare session credits ────────────────────────────────────────

  console.log("\n--- Session Credits (Coaching Clients) ---");
  const sessionClients = clientsData.clients.map((c: any) => ({
    name: c.name,
    email: c.linked_email || undefined,
    phone: c.phone || undefined,
    packageType: c.package_type,
    totalSessions: c.total_sessions,
    sessionsUsed: c.sessions_used,
    sessionsRemaining: c.sessions_remaining,
    expiryDate: c.expiry_date || undefined,
    assignedCoach: c.assigned_coach,
    status: c.status,
  }));

  const packageCounts: Record<string, number> = {};
  for (const c of sessionClients) {
    packageCounts[c.packageType || "unknown"] = (packageCounts[c.packageType || "unknown"] || 0) + 1;
  }
  console.log("  Package breakdown:");
  for (const [pkg, count] of Object.entries(packageCounts)) {
    console.log(`    ${pkg}: ${count} clients`);
  }

  // ─── Output migration commands ──────────────────────────────────────

  console.log("\n=== Run these Convex commands to import ===\n");
  console.log("1. First, get your user ID from the Convex dashboard (users table)");
  console.log("2. Then run in order:\n");
  console.log('   npx convex run seed:seedWsFitness \'{"ownerUserId":"YOUR_USER_ID"}\'');
  console.log("   (This creates the tenant, services, and business hours)\n");
  console.log("3. Then import plans, coaches, members, and session credits");
  console.log("   using the importMembershipPlans, importCoaches, importMembers,");
  console.log("   and importSessionCredits mutations from the Convex dashboard.\n");

  // ─── Write prepared data to temp files for Convex console ───────────

  const outputDir = path.join(DATA_DIR, "prepared");
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "plans.json"),
    JSON.stringify(plans, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "coaches.json"),
    JSON.stringify(coaches, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "members.json"),
    JSON.stringify(members, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "session-credits.json"),
    JSON.stringify(sessionClients, null, 2)
  );

  console.log(`Prepared data written to ${outputDir}/`);
  console.log("  plans.json, coaches.json, members.json, session-credits.json\n");

  // ─── Summary ────────────────────────────────────────────────────────

  console.log("=== Migration Summary ===");
  console.log(`  Tenant: WS Fitness (ws-fitness)`);
  console.log(`  Membership plans: ${plans.length}`);
  console.log(`  Coaches: ${coaches.length}`);
  console.log(`  Members: ${members.length}`);
  console.log(`  Session credit records: ${sessionClients.length}`);
  console.log(`  Billing records: ${billingData.length} (archived, not imported)`);
  console.log("\nDone!");
}

main().catch(console.error);
