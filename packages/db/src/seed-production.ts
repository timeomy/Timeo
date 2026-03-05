import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { generateId } from "./id";
import {
  user as authUser,
  account as authAccount,
  users,
  platformConfig,
  featureFlags,
} from "./schema/index";

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const bytes = randomBytes(24);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// ─── Production Seed ──────────────────────────────────────────────────────────
// Creates ONLY:
//   1. Platform admin user (Better Auth + Timeo)
//   2. Platform config entries
//   3. Feature flags
//
// No demo tenants, no demo data. Idempotent — skips if admin exists.

async function seedProduction() {
  console.log("\n  Seeding production database...\n");

  // ── Idempotency check ─────────────────────────────────────────────────────

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@timeo.my"))
    .limit(1);

  if (existing.length > 0) {
    console.log("  Platform admin already exists — skipping seed.\n");
    process.exit(0);
  }

  // ── 1. Platform Admin ─────────────────────────────────────────────────────

  const adminPassword = generatePassword();
  const passwordHash = await hashPassword(adminPassword);
  const authId = generateId();
  const timeoId = generateId();
  const accountId = generateId();

  await db.insert(authUser).values({
    id: authId,
    name: "Platform Admin",
    email: "admin@timeo.my",
    emailVerified: true,
  });

  await db.insert(authAccount).values({
    id: accountId,
    accountId: authId,
    providerId: "credential",
    userId: authId,
    password: passwordHash,
  });

  await db.insert(users).values({
    id: timeoId,
    auth_id: authId,
    email: "admin@timeo.my",
    name: "Platform Admin",
  });

  console.log("  Created platform admin user");

  // ── 2. Platform Config ────────────────────────────────────────────────────

  const configEntries = [
    { section: "general", key: "maintenance_mode", value: false },
    { section: "general", key: "supported_currencies", value: ["MYR"] },
    {
      section: "general",
      key: "default_timezone",
      value: "Asia/Kuala_Lumpur",
    },
    { section: "general", key: "platform_name", value: "Timeo" },
    { section: "email", key: "sender_name", value: "Timeo" },
    { section: "email", key: "sender_address", value: "noreply@timeo.my" },
    {
      section: "auth",
      key: "max_login_attempts",
      value: 5,
    },
    {
      section: "auth",
      key: "lockout_duration_minutes",
      value: 15,
    },
  ];

  for (const entry of configEntries) {
    await db.insert(platformConfig).values({
      id: generateId(),
      section: entry.section,
      key: entry.key,
      value: entry.value,
      updated_by: timeoId,
    });
  }

  console.log(`  Created ${configEntries.length} platform config entries`);

  // ── 3. Feature Flags ──────────────────────────────────────────────────────

  const flagDefs = [
    {
      key: "pos_enabled",
      name: "POS",
      description: "Point-of-sale order taking and payment processing",
      default_enabled: true,
      phase: "2",
    },
    {
      key: "appointments_enabled",
      name: "Appointments",
      description: "Service booking and scheduling",
      default_enabled: true,
      phase: "3",
    },
    {
      key: "loyalty_enabled",
      name: "Loyalty",
      description: "Points and rewards programme",
      default_enabled: false,
      phase: "4",
    },
    {
      key: "einvoice_enabled",
      name: "e-Invoice",
      description: "LHDN MyInvois e-invoice submission",
      default_enabled: false,
      phase: "3",
    },
    {
      key: "revenue_monster_enabled",
      name: "Revenue Monster",
      description: "FPX and eWallet payments via Revenue Monster",
      default_enabled: false,
      phase: "2",
    },
    {
      key: "offline_sync_enabled",
      name: "Offline POS Sync",
      description: "MMKV/SQLite local queue for offline POS",
      default_enabled: false,
      phase: "5",
    },
  ];

  for (const f of flagDefs) {
    await db.insert(featureFlags).values({
      id: generateId(),
      key: f.key,
      name: f.name,
      description: f.description,
      default_enabled: f.default_enabled,
      phase: f.phase,
    });
  }

  console.log(`  Created ${flagDefs.length} feature flags`);

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  Production seed complete                                │");
  console.log("├──────────────────────────────────────────────────────────┤");
  console.log("│                                                          │");
  console.log("│  Platform Admin Credentials:                             │");
  console.log("│  Email:    admin@timeo.my                                │");
  console.log(`│  Password: ${adminPassword.padEnd(44)} │`);
  console.log("│                                                          │");
  console.log("│  SAVE THIS PASSWORD NOW — it cannot be retrieved later.  │");
  console.log("│                                                          │");
  console.log("└──────────────────────────────────────────────────────────┘\n");

  process.exit(0);
}

seedProduction().catch((err) => {
  console.error("\n  Production seed failed:", err);
  process.exit(1);
});
