import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { generateId } from "@timeo/db";
import {
  tenantMemberships,
  users,
  tenants,
  user as authUser,
  account as authAccount,
} from "@timeo/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

async function hashTempPassword(password: string): Promise<string> {
  const { hashPassword } = await import("better-auth/crypto");
  return hashPassword(password);
}

// GET /tenants/:tenantId/staff
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_staff"),
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

      // Only surface staff + admin on this endpoint (customers go via /gym/members)
      const staffMembers = members.filter((m) => m.role === "staff" || m.role === "admin").map((m) => ({
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

// POST /tenants/:tenantId/staff/invite
app.post(
  "/invite",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_staff"),
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      name: z.string().min(1).max(200).optional(),
      role: z.enum(["staff", "admin"]),
    }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      // Get tenant info for invite email
      const [tenant] = await db
        .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return c.json(error("TENANT_NOT_FOUND", "Tenant not found"), 404);
      }

      // Find or create user by email
      const [existingUser] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      let userId: string;
      let memberStatus: "active" | "invited";
      let inviteContext: { name: string; tempPassword: string } | null = null;

      if (existingUser) {
        userId = existingUser.id;
        memberStatus = "active";
      } else {
        // New user — create auth + timeo records
        const authId = generateId();
        const timeoId = generateId();
        const tempPassword = generateId().slice(0, 12);
        const passwordHash = await hashTempPassword(tempPassword);
        const memberName = body.name || body.email.split("@")[0];

        await db.insert(authUser).values({
          id: authId,
          name: memberName,
          email: body.email,
          emailVerified: false,
        });

        await db.insert(authAccount).values({
          id: generateId(),
          accountId: authId,
          providerId: "credential",
          userId: authId,
          password: passwordHash,
        });

        await db.insert(users).values({
          id: timeoId,
          auth_id: authId,
          email: body.email,
          name: memberName,
          role: "user",
          force_password_reset: true,
        });

        userId = timeoId;
        memberStatus = "invited";
        inviteContext = { name: memberName, tempPassword };
      }

      // Check if membership already exists
      const [existing] = await db
        .select({ id: tenantMemberships.id, role: tenantMemberships.role, status: tenantMemberships.status })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, userId),
          ),
        )
        .limit(1);

      if (existing) {
        // If they exist but have a different role or status, update it
        if (existing.status === "removed" || existing.role !== body.role) {
          await db
            .update(tenantMemberships)
            .set({ role: body.role, status: "active" })
            .where(eq(tenantMemberships.id, existing.id));
          return c.json(success({ updated: true, userId, role: body.role }));
        }
        return c.json(
          error("ALREADY_MEMBER", "User is already a team member"),
          409,
        );
      }

      // Create membership
      const membershipId = generateId();
      await db.insert(tenantMemberships).values({
        id: membershipId,
        user_id: userId,
        tenant_id: tenantId,
        role: body.role,
        status: memberStatus,
      });

      // Send invite email for new users
      if (inviteContext) {
        try {
          const { sendMail } = await import("@timeo/auth/email");
          const { tenantInviteEmail } = await import("@timeo/auth/email-templates");
          const invite = tenantInviteEmail({
            name: inviteContext.name,
            businessName: tenant.name,
            tempPassword: inviteContext.tempPassword,
            signInUrl: `${SITE_URL}/sign-in`,
          });
          await sendMail({ to: body.email, subject: invite.subject, html: invite.html });
        } catch (emailErr) {
          // Don't fail the invite if email fails — just log it
          console.error("Failed to send invite email:", emailErr);
        }
      }

      return c.json(success({ created: true, userId, membershipId, role: body.role }), 201);
    } catch (err) {
      return c.json(error("INVITE_ERROR", (err as Error).message), 500);
    }
  },
);

// PATCH /tenants/:tenantId/staff/:memberId
app.patch(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");
    const body = await c.req.json();

    try {
      // memberId can be tenantMemberships.id or user_id — try both
      const [byId] = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.id, memberId),
            eq(tenantMemberships.tenant_id, tenantId),
          ),
        )
        .limit(1);

      const [byUserId] = byId
        ? [byId]
        : await db
            .select({ id: tenantMemberships.id })
            .from(tenantMemberships)
            .where(
              and(
                eq(tenantMemberships.user_id, memberId),
                eq(tenantMemberships.tenant_id, tenantId),
              ),
            )
            .limit(1);

      const rowId = byId?.id ?? byUserId?.id;
      if (!rowId) {
        return c.json(error("NOT_FOUND", "Staff member not found"), 404);
      }

      const [updated] = await db
        .update(tenantMemberships)
        .set({ role: body.role })
        .where(eq(tenantMemberships.id, rowId))
        .returning();

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
  requireCapability("manage_staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");

    try {
      // memberId can be tenantMemberships.id or user_id — try both
      const [byId] = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.id, memberId),
            eq(tenantMemberships.tenant_id, tenantId),
          ),
        )
        .limit(1);

      const [byUserId] = byId
        ? [byId]
        : await db
            .select({ id: tenantMemberships.id })
            .from(tenantMemberships)
            .where(
              and(
                eq(tenantMemberships.user_id, memberId),
                eq(tenantMemberships.tenant_id, tenantId),
              ),
            )
            .limit(1);

      const rowId = byId?.id ?? byUserId?.id;
      if (!rowId) {
        return c.json(error("NOT_FOUND", "Staff member not found"), 404);
      }

      const [removed] = await db
        .update(tenantMemberships)
        .set({ status: "removed" })
        .where(eq(tenantMemberships.id, rowId))
        .returning();

      return c.json(success({ removed: true }));
    } catch (err) {
      return c.json(error("STAFF_DELETE_ERROR", (err as Error).message), 500);
    }
  },
);

export { app as staffRouter };
