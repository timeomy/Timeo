import { createMiddleware } from "hono/factory";
import { db } from "@timeo/db";
import { tenantMemberships } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const tenantMiddleware = createMiddleware(async (c, next) => {
  const tenantId = c.req.param("tenantId");
  if (!tenantId) {
    return c.json(
      {
        success: false,
        error: { code: "MISSING_TENANT", message: "tenantId required" },
      },
      400,
    );
  }

  const user = c.get("user");
  if (!user) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      401,
    );
  }

  const [membership] = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "No access to this tenant" },
      },
      403,
    );
  }

  c.set("tenantId", tenantId);

  // Set RLS context for this request
  await db.execute(
    sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`,
  );

  await next();
});
