import { db } from "@timeo/db";
import { auditLogs, generateId } from "@timeo/db";

export async function insertAudit(
  actorId: string,
  actorRole: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ip?: string,
  tenantId?: string,
) {
  await db.insert(auditLogs).values({
    id: generateId(),
    actor_id: actorId,
    actor_role: actorRole,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: ip,
    tenant_id: tenantId ?? null,
  });
}

export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    undefined
  );
}
