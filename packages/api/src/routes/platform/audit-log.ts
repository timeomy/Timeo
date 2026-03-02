import { Hono } from "hono";
import { db } from "@timeo/db";
import { auditLogs } from "@timeo/db/schema";
import { desc, and, eq, gte, lte, sql } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";

const app = new Hono();

// GET /audit-log — query with filters
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const tenantId = c.req.query("tenantId");
  const actorId = c.req.query("actorId");
  const action = c.req.query("action");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const conditions = [];

  if (tenantId) conditions.push(eq(auditLogs.tenant_id, tenantId));
  if (actorId) conditions.push(eq(auditLogs.actor_id, actorId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (from) conditions.push(gte(auditLogs.created_at, new Date(from)));
  if (to) conditions.push(lte(auditLogs.created_at, new Date(to)));

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  return c.json(
    success({
      items: rows,
      total: total?.count ?? 0,
      limit,
      offset,
    }),
  );
});

export { app as auditLogRouter };
