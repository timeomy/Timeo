import { Hono } from "hono";
import { db } from "@timeo/db";
import { tenantMemberships, users } from "@timeo/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /tenants/:tenantId/staff
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");

    try {
      const members = await db
        .select({
          id: tenantMemberships.id,
          userId: tenantMemberships.user_id,
          tenantId: tenantMemberships.tenant_id,
          role: tenantMemberships.role,
          status: tenantMemberships.status,
          joinedAt: tenantMemberships.joined_at,
          name: users.name,
          email: users.email,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.status, "active"),
          ),
        );

      const staffMembers = members.map((m) => ({
        id: m.id,
        userId: m.userId,
        tenantId: m.tenantId,
        name: m.name,
        email: m.email,
        role: m.role,
        isActive: m.status === "active",
        joinedAt: m.joinedAt?.toISOString() ?? null,
      }));

      return c.json(success(staffMembers));
    } catch (err) {
      return c.json(error("STAFF_ERROR", (err as Error).message), 500);
    }
  },
);

// PATCH /tenants/:tenantId/staff/:memberId
app.patch(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");
    const body = await c.req.json();

    try {
      const [updated] = await db
        .update(tenantMemberships)
        .set({ role: body.role })
        .where(
          and(
            eq(tenantMemberships.id, memberId),
            eq(tenantMemberships.tenant_id, tenantId),
          ),
        )
        .returning();

      if (!updated) {
        return c.json(error("NOT_FOUND", "Staff member not found"), 404);
      }

      return c.json(success(updated));
    } catch (err) {
      return c.json(error("STAFF_UPDATE_ERROR", (err as Error).message), 500);
    }
  },
);

// DELETE /tenants/:tenantId/staff/:memberId
app.delete(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");

    try {
      const [removed] = await db
        .update(tenantMemberships)
        .set({ status: "removed" })
        .where(
          and(
            eq(tenantMemberships.id, memberId),
            eq(tenantMemberships.tenant_id, tenantId),
          ),
        )
        .returning();

      if (!removed) {
        return c.json(error("NOT_FOUND", "Staff member not found"), 404);
      }

      return c.json(success({ removed: true }));
    } catch (err) {
      return c.json(error("STAFF_DELETE_ERROR", (err as Error).message), 500);
    }
  },
);

export { app as staffRouter };
