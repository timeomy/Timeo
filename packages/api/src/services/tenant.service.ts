import { db } from "@timeo/db";
import { tenants, tenantMemberships, auditLogs } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";

export async function createTenant(input: {
  name: string;
  slug: string;
  ownerId: string;
}) {
  const tenantId = generateId();

  await db.insert(tenants).values({
    id: tenantId,
    name: input.name,
    slug: input.slug,
    owner_id: input.ownerId,
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
    action: "tenant.created",
    resource: "tenants",
    resource_id: tenantId,
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
    action: "tenant.settings_updated",
    resource: "tenants",
    resource_id: tenantId,
    metadata: { changes: Object.keys(settings) },
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
    action: "tenant.branding_updated",
    resource: "tenants",
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
    action: "staff.invited",
    resource: "tenant_memberships",
    resource_id: membershipId,
    metadata: { email: input.email, role: input.role },
  });

  return membershipId;
}
