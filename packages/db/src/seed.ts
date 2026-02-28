import { db } from "./client.js";
import { generateId } from "./id.js";
import {
  users,
  tenants,
  tenantMemberships,
  services,
  businessHours,
  memberships,
  products,
  platformConfig,
} from "./schema/index.js";

async function seed() {
  console.log("Seeding database...");

  // ─── Platform Admin User ─────────────────────────────────────────────
  const adminUserId = generateId();
  await db.insert(users).values({
    id: adminUserId,
    email: "admin@timeo.my",
    name: "Platform Admin",
  });

  // ─── Demo Tenant ──────────────────────────────────────────────────────
  const tenantId = generateId();
  await db.insert(tenants).values({
    id: tenantId,
    name: "Demo Gym",
    slug: "demo-gym",
    owner_id: adminUserId,
    plan: "pro",
    status: "active",
    settings: {
      timezone: "Asia/Kuala_Lumpur",
      businessHours: { open: "08:00", close: "22:00" },
      bookingBuffer: 15,
      autoConfirmBookings: true,
    },
    branding: {
      primaryColor: "#2563eb",
      businessName: "Demo Gym",
    },
  });

  // ─── Tenant Membership ────────────────────────────────────────────────
  await db.insert(tenantMemberships).values({
    id: generateId(),
    user_id: adminUserId,
    tenant_id: tenantId,
    role: "admin",
    status: "active",
  });

  // ─── Business Hours (Mon-Sat) ─────────────────────────────────────────
  const days = [
    { day: 0, open: false }, // Sunday
    { day: 1, open: true },
    { day: 2, open: true },
    { day: 3, open: true },
    { day: 4, open: true },
    { day: 5, open: true },
    { day: 6, open: true },
  ];
  await db.insert(businessHours).values(
    days.map((d) => ({
      id: generateId(),
      tenant_id: tenantId,
      day_of_week: d.day,
      open_time: "08:00",
      close_time: "22:00",
      is_open: d.open,
    })),
  );

  // ─── Sample Services ──────────────────────────────────────────────────
  const serviceIds = [generateId(), generateId(), generateId()];
  await db.insert(services).values([
    {
      id: serviceIds[0],
      tenant_id: tenantId,
      name: "Personal Training (1 hour)",
      description: "One-on-one personal training session with a certified trainer",
      duration_minutes: 60,
      price: 15000, // RM150.00
      currency: "MYR",
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: serviceIds[1],
      tenant_id: tenantId,
      name: "Group Fitness Class",
      description: "High-energy group fitness class for all levels",
      duration_minutes: 45,
      price: 5000, // RM50.00
      currency: "MYR",
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: serviceIds[2],
      tenant_id: tenantId,
      name: "Body Assessment",
      description: "Comprehensive body composition and fitness assessment",
      duration_minutes: 30,
      price: 8000, // RM80.00
      currency: "MYR",
      is_active: true,
      created_by: adminUserId,
    },
  ]);

  // ─── Sample Products ──────────────────────────────────────────────────
  await db.insert(products).values([
    {
      id: generateId(),
      tenant_id: tenantId,
      name: "Protein Shake",
      description: "Whey protein shake - chocolate or vanilla",
      price: 1500, // RM15.00
      currency: "MYR",
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: generateId(),
      tenant_id: tenantId,
      name: "Gym Towel",
      description: "Premium microfiber gym towel",
      price: 3500, // RM35.00
      currency: "MYR",
      is_active: true,
      created_by: adminUserId,
    },
  ]);

  // ─── Sample Membership Plans ──────────────────────────────────────────
  await db.insert(memberships).values([
    {
      id: generateId(),
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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

  // ─── Platform Config ──────────────────────────────────────────────────
  await db.insert(platformConfig).values([
    {
      id: generateId(),
      key: "maintenance_mode",
      value: false,
    },
    {
      id: generateId(),
      key: "supported_currencies",
      value: ["MYR"],
    },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
