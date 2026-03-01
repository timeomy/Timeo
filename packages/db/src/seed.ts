import { eq } from "drizzle-orm";
import { db } from "./client";
import { generateId } from "./id";
import {
  // Better Auth tables
  user as authUser,
  account as authAccount,
  // Timeo tables
  users,
  tenants,
  tenantMemberships,
  services,
  products,
  bookings,
  businessHours,
  memberships,
  platformConfig,
  featureFlags,
} from "./schema/index";

// Use dynamic import for bcryptjs (ESM compat)
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

// ─── Seed Data Definitions ──────────────────────────────────────────────────

const USERS = [
  { email: "admin@timeo.my", name: "Platform Admin", password: "Admin1234!" },
  { email: "gym@demo.my", name: "Gym Owner", password: "Demo1234!" },
  { email: "cafe@demo.my", name: "Cafe Owner", password: "Demo1234!" },
  { email: "staff@demo.my", name: "Staff Member", password: "Demo1234!" },
  { email: "customer@demo.my", name: "Demo Customer", password: "Demo1234!" },
] as const;

const TENANTS = [
  {
    name: "Iron Paradise Gym",
    slug: "iron-paradise",
    plan: "pro" as const,
    ownerEmail: "gym@demo.my",
    settings: {
      timezone: "Asia/Kuala_Lumpur",
      businessHours: { open: "06:00", close: "23:00" },
      bookingBuffer: 15,
      autoConfirmBookings: false,
    },
    branding: {
      primaryColor: "#dc2626",
      businessName: "Iron Paradise Gym",
    },
  },
  {
    name: "Brew & Bean Cafe",
    slug: "brew-bean",
    plan: "starter" as const,
    ownerEmail: "cafe@demo.my",
    settings: {
      timezone: "Asia/Kuala_Lumpur",
      businessHours: { open: "07:00", close: "22:00" },
      bookingBuffer: 0,
      autoConfirmBookings: true,
    },
    branding: {
      primaryColor: "#92400e",
      businessName: "Brew & Bean Cafe",
    },
  },
] as const;

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function seed() {
  console.log("\nSeeding database...\n");

  const counts = {
    users: 0,
    authUsers: 0,
    authAccounts: 0,
    tenants: 0,
    memberships: 0,
    services: 0,
    products: 0,
    bookings: 0,
    businessHours: 0,
    membershipPlans: 0,
    platformConfig: 0,
    featureFlags: 0,
  };

  // ── 1. Users (Better Auth + Timeo) ──────────────────────────────────────

  // Check if already seeded (idempotency)
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@timeo.my"))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("Database already seeded — skipping.\n");
    process.exit(0);
  }

  // Maps to track IDs by email
  const authUserIds = new Map<string, string>();
  const timeoUserIds = new Map<string, string>();

  for (const u of USERS) {
    const authId = generateId();
    const timeoId = generateId();
    const accountId = generateId();
    const passwordHash = await hashPassword(u.password);

    // Better Auth `user` table
    await db.insert(authUser).values({
      id: authId,
      name: u.name,
      email: u.email,
      emailVerified: true,
    });
    counts.authUsers++;

    // Better Auth `account` table (credential provider)
    await db.insert(authAccount).values({
      id: accountId,
      accountId: authId,
      providerId: "credential",
      userId: authId,
      password: passwordHash,
    });
    counts.authAccounts++;

    // Timeo `users` table
    await db.insert(users).values({
      id: timeoId,
      auth_id: authId,
      email: u.email,
      name: u.name,
    });
    counts.users++;

    authUserIds.set(u.email, authId);
    timeoUserIds.set(u.email, timeoId);
  }

  console.log(`  Created ${counts.users} users (auth + timeo)`);

  // ── 2. Tenants ──────────────────────────────────────────────────────────

  const tenantIds = new Map<string, string>();

  for (const t of TENANTS) {
    const tenantId = generateId();
    const ownerId = timeoUserIds.get(t.ownerEmail)!;

    await db.insert(tenants).values({
      id: tenantId,
      name: t.name,
      slug: t.slug,
      owner_id: ownerId,
      plan: t.plan,
      status: "active",
      settings: t.settings,
      branding: t.branding,
      payment_gateway: "stripe",
    });
    counts.tenants++;

    tenantIds.set(t.slug, tenantId);
  }

  console.log(`  Created ${counts.tenants} tenants`);

  // ── 3. Tenant Memberships ───────────────────────────────────────────────

  const gymId = tenantIds.get("iron-paradise")!;
  const cafeId = tenantIds.get("brew-bean")!;

  const membershipDefs = [
    { email: "gym@demo.my", tenantId: gymId, role: "admin" as const },
    { email: "cafe@demo.my", tenantId: cafeId, role: "admin" as const },
    { email: "staff@demo.my", tenantId: gymId, role: "staff" as const },
    { email: "customer@demo.my", tenantId: gymId, role: "customer" as const },
  ];

  for (const m of membershipDefs) {
    await db.insert(tenantMemberships).values({
      id: generateId(),
      user_id: timeoUserIds.get(m.email)!,
      tenant_id: m.tenantId,
      role: m.role,
      status: "active",
    });
    counts.memberships++;
  }

  console.log(`  Created ${counts.memberships} tenant memberships`);

  // ── 4. Services (Iron Paradise Gym) ─────────────────────────────────────

  const gymOwnerId = timeoUserIds.get("gym@demo.my")!;
  const serviceIds: string[] = [];

  const serviceDefs = [
    {
      name: "Personal Training Session",
      description: "One-on-one personal training session with a certified trainer",
      duration_minutes: 60,
      price: 15000, // RM150.00
    },
    {
      name: "Group Fitness Class",
      description: "High-energy group fitness class for all levels",
      duration_minutes: 45,
      price: 5000, // RM50.00
    },
    {
      name: "Yoga Class",
      description: "Relaxing yoga session for flexibility and mindfulness",
      duration_minutes: 60,
      price: 6000, // RM60.00
    },
  ];

  for (const s of serviceDefs) {
    const id = generateId();
    serviceIds.push(id);
    await db.insert(services).values({
      id,
      tenant_id: gymId,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: s.price,
      currency: "MYR",
      is_active: true,
      created_by: gymOwnerId,
    });
    counts.services++;
  }

  console.log(`  Created ${counts.services} services (Iron Paradise)`);

  // ── 5. Products (Brew & Bean Cafe) ──────────────────────────────────────

  const cafeOwnerId = timeoUserIds.get("cafe@demo.my")!;

  const productDefs = [
    {
      name: "Iced Americano",
      description: "Double-shot espresso over ice with filtered water",
      price: 1200, // RM12.00
    },
    {
      name: "Croissant",
      description: "Freshly baked butter croissant",
      price: 800, // RM8.00
    },
    {
      name: "Cold Brew Bundle",
      description: "3-pack of bottled cold brew coffee for takeaway",
      price: 2500, // RM25.00
    },
  ];

  for (const p of productDefs) {
    await db.insert(products).values({
      id: generateId(),
      tenant_id: cafeId,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: "MYR",
      is_active: true,
      created_by: cafeOwnerId,
    });
    counts.products++;
  }

  console.log(`  Created ${counts.products} products (Brew & Bean)`);

  // ── 6. Bookings (Customer at Iron Paradise) ─────────────────────────────

  const customerId = timeoUserIds.get("customer@demo.my")!;

  // Tomorrow at 10:00 AM MYT
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  // 3 days from now at 6:00 PM MYT
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  threeDays.setHours(18, 0, 0, 0);

  const threeDaysEnd = new Date(threeDays);
  threeDaysEnd.setMinutes(threeDaysEnd.getMinutes() + 45);

  await db.insert(bookings).values([
    {
      id: generateId(),
      tenant_id: gymId,
      customer_id: customerId,
      service_id: serviceIds[0], // Personal Training Session
      start_time: tomorrow,
      end_time: tomorrowEnd,
      status: "confirmed",
      notes: "First personal training session",
    },
    {
      id: generateId(),
      tenant_id: gymId,
      customer_id: customerId,
      service_id: serviceIds[1], // Group Fitness Class
      start_time: threeDays,
      end_time: threeDaysEnd,
      status: "pending",
    },
  ]);
  counts.bookings = 2;

  console.log(`  Created ${counts.bookings} bookings`);

  // ── 7. Business Hours (Iron Paradise: Mon-Sat 6am-11pm) ────────────────

  const daySchedule = [
    { day: 0, open: false }, // Sunday
    { day: 1, open: true },
    { day: 2, open: true },
    { day: 3, open: true },
    { day: 4, open: true },
    { day: 5, open: true },
    { day: 6, open: true },
  ];

  await db.insert(businessHours).values(
    daySchedule.map((d) => ({
      id: generateId(),
      tenant_id: gymId,
      day_of_week: d.day,
      open_time: "06:00",
      close_time: "23:00",
      is_open: d.open,
    })),
  );
  counts.businessHours = 7;

  console.log(`  Created ${counts.businessHours} business hours entries`);

  // ── 8. Membership Plans (Iron Paradise) ─────────────────────────────────

  await db.insert(memberships).values([
    {
      id: generateId(),
      tenant_id: gymId,
      name: "Basic Monthly",
      description: "Access to gym facilities and group classes",
      price: 15000, // RM150.00
      currency: "MYR",
      interval: "monthly",
      features: ["Gym access", "Group classes", "Locker"],
      is_active: true,
    },
    {
      id: generateId(),
      tenant_id: gymId,
      name: "Premium Yearly",
      description: "All-inclusive access with personal training sessions",
      price: 150000, // RM1,500.00
      currency: "MYR",
      interval: "yearly",
      features: [
        "Gym access",
        "Group classes",
        "Locker",
        "4x PT sessions/month",
        "Body assessment",
      ],
      is_active: true,
    },
  ]);
  counts.membershipPlans = 2;

  console.log(`  Created ${counts.membershipPlans} membership plans`);

  // ── 9. Platform Config ──────────────────────────────────────────────────

  await db.insert(platformConfig).values([
    { id: generateId(), key: "maintenance_mode", value: false },
    { id: generateId(), key: "supported_currencies", value: ["MYR"] },
  ]);
  counts.platformConfig = 2;

  console.log(`  Created ${counts.platformConfig} platform config entries`);

  // ── 10. Feature Flags ───────────────────────────────────────────────────

  const flagDefs = [
    { key: "enable_revenue_monster", enabled: false },
    { key: "enable_eInvoice", enabled: false },
    { key: "enable_loyalty", enabled: false },
  ];

  for (const f of flagDefs) {
    await db.insert(featureFlags).values({
      id: generateId(),
      key: f.key,
      tenant_id: null,
      enabled: f.enabled,
    });
    counts.featureFlags++;
  }

  console.log(`  Created ${counts.featureFlags} feature flags`);

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n┌─────────────────────────┬───────┐");
  console.log("│ Record Type             │ Count │");
  console.log("├─────────────────────────┼───────┤");
  console.log(`│ Auth Users              │   ${String(counts.authUsers).padStart(3)} │`);
  console.log(`│ Auth Accounts           │   ${String(counts.authAccounts).padStart(3)} │`);
  console.log(`│ Timeo Users             │   ${String(counts.users).padStart(3)} │`);
  console.log(`│ Tenants                 │   ${String(counts.tenants).padStart(3)} │`);
  console.log(`│ Tenant Memberships      │   ${String(counts.memberships).padStart(3)} │`);
  console.log(`│ Services                │   ${String(counts.services).padStart(3)} │`);
  console.log(`│ Products                │   ${String(counts.products).padStart(3)} │`);
  console.log(`│ Bookings                │   ${String(counts.bookings).padStart(3)} │`);
  console.log(`│ Business Hours          │   ${String(counts.businessHours).padStart(3)} │`);
  console.log(`│ Membership Plans        │   ${String(counts.membershipPlans).padStart(3)} │`);
  console.log(`│ Platform Config         │   ${String(counts.platformConfig).padStart(3)} │`);
  console.log(`│ Feature Flags           │   ${String(counts.featureFlags).padStart(3)} │`);
  console.log("└─────────────────────────┴───────┘");

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nTotal: ${total} records created.`);

  console.log("\n── Demo Credentials ─────────────────────────────────────");
  console.log("  admin@timeo.my     / Admin1234!   (platform admin)");
  console.log("  gym@demo.my        / Demo1234!    (Iron Paradise admin)");
  console.log("  cafe@demo.my       / Demo1234!    (Brew & Bean admin)");
  console.log("  staff@demo.my      / Demo1234!    (Iron Paradise staff)");
  console.log("  customer@demo.my   / Demo1234!    (Iron Paradise customer)");
  console.log("");

  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
