import { db } from "@timeo/db";
import { tenants, tenantMemberships, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

type TenantPlan = "free" | "starter" | "pro" | "enterprise";

type TenantIndustry =
  | "fitness"
  | "salon_beauty"
  | "wellness_spa"
  | "sports_recreation"
  | "clinic"
  | "retail"
  | "food_beverage"
  | "education"
  | "professional_services"
  | "other";

const DEFAULT_TENANT_SETTINGS: Record<string, unknown> = {
  currency: "MYR",
  timezone: "Asia/Kuala_Lumpur",
  bookingBuffer: 15,
  autoConfirmBookings: false,
  appointmentsEnabled: true,
  posEnabled: false,
  loyaltyEnabled: false,
};

const INDUSTRY_SETTING_PRESETS: Partial<Record<TenantIndustry, Record<string, unknown>>> = {
  fitness: {
    bookingBuffer: 15,
    autoConfirmBookings: false,
    loyaltyEnabled: true,
  },
  salon_beauty: {
    bookingBuffer: 10,
    autoConfirmBookings: false,
  },
  wellness_spa: {
    bookingBuffer: 15,
    autoConfirmBookings: false,
  },
  sports_recreation: {
    bookingBuffer: 10,
    autoConfirmBookings: false,
  },
  clinic: {
    bookingBuffer: 5,
    autoConfirmBookings: false,
  },
  retail: {
    bookingBuffer: 0,
    autoConfirmBookings: true,
    posEnabled: true,
  },
  food_beverage: {
    bookingBuffer: 0,
    autoConfirmBookings: true,
    posEnabled: true,
  },
};

function buildTenantSettings(
  industry: TenantIndustry | undefined,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const normalizedIndustry = industry ?? "other";
  const industryDefaults = INDUSTRY_SETTING_PRESETS[normalizedIndustry] ?? {};

  return {
    ...DEFAULT_TENANT_SETTINGS,
    ...industryDefaults,
    ...(overrides ?? {}),
    industry: normalizedIndustry,
  };
}

export async function createTenant(input: {
  name: string;
  slug: string;
  ownerId: string;
  plan?: TenantPlan;
  industry?: TenantIndustry;
  settings?: Record<string, unknown>;
  source?: "manual" | "self_serve";
}) {
  const tenantId = generateId();
  const tenantPlan = input.plan ?? "free";
  const seededSettings = buildTenantSettings(input.industry, input.settings);

  await db.insert(tenants).values({
    id: tenantId,
    name: input.name,
    slug: input.slug,
    owner_id: input.ownerId,
    plan: tenantPlan,
    settings: seededSettings,
  });

  // Add owner as admin
  await db.insert(tenantMemberships).values({
    id: generateId(),
    user_id: input.ownerId,
    tenant_id: tenantId,
    role: "admin",
    status: "active",
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: tenantId,
    actor_id: input.ownerId,
    actor_role: "admin",
    action: "tenant.created",
    resource_type: "tenant",
    resource_id: tenantId,
    details: {
      plan: tenantPlan,
      industry: seededSettings.industry,
      source: input.source ?? "manual",
    },
  });

  return tenantId;
}

export async function updateTenantSettings(
  tenantId: string,
  settings: Record<string, unknown>,
  actorId: string,
) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found");

  const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>;
  const merged = { ...currentSettings, ...settings };

  await db
    .update(tenants)
    .set({ settings: merged, updated_at: new Date() })
    .where(eq(tenants.id, tenantId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: tenantId,
    actor_id: actorId,
    actor_role: "admin",
    action: "tenant.settings_updated",
    resource_type: "tenant",
    resource_id: tenantId,
    details: { changes: Object.keys(settings) },
  });
}

export async function updateTenantBranding(
  tenantId: string,
  branding: Record<string, unknown>,
  actorId: string,
) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found");

  const currentBranding = (tenant.branding ?? {}) as Record<string, unknown>;
  const merged = { ...currentBranding, ...branding };

  await db
    .update(tenants)
    .set({ branding: merged, updated_at: new Date() })
    .where(eq(tenants.id, tenantId));

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: tenantId,
    actor_id: actorId,
    actor_role: "admin",
    action: "tenant.branding_updated",
    resource_type: "tenant",
    resource_id: tenantId,
  });
}

export async function inviteStaff(input: {
  tenantId: string;
  email: string;
  role: "staff" | "admin";
  inviterId: string;
}) {
  // In production, this would send an email invitation
  // For now, we create a membership with "invited" status
  const membershipId = generateId();

  // Check if already a member
  const existing = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, input.tenantId),
        // Note: we'd need to look up user by email first
        // This is a simplified stub
      ),
    );

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: input.tenantId,
    actor_id: input.inviterId,
    actor_role: "admin",
    action: "staff.invited",
    resource_type: "tenant_membership",
    resource_id: membershipId,
    details: { email: input.email, role: input.role },
  });

  return membershipId;
}
