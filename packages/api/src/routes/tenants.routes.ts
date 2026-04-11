import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import {
  tenants,
  tenantMemberships,
  users,
  featureFlags,
  featureFlagOverrides,
} from "@timeo/db/schema";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import {
  CreateTenantSchema,
  UpdateTenantSettingsSchema,
  UpdateTenantBrandingSchema,
  AddTenantMemberSchema,
} from "../lib/validation.js";
import * as TenantService from "../services/tenant.service.js";
import { getEffectiveFeatureFlags } from "../services/template-resolver.js";

const app = new Hono();

// GET /tenants/public - list public tenants (no auth required)
app.get("/public", async (c) => {
  const search = c.req.query("search");

  const conditions = [
    eq(tenants.is_public, true),
    inArray(tenants.status, ["active", "trial"]),
  ];

  if (search && search.trim()) {
    conditions.push(ilike(tenants.name, `%${search.trim()}%`));
  }

  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      branding: tenants.branding,
    })
    .from(tenants)
    .where(and(...conditions));

  const result = rows.map((row) => {
    const branding = (row.branding ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: branding.logo as string | undefined,
      logoUrl: branding.logoUrl as string | undefined,
      primaryColor: branding.primaryColor as string | undefined,
    };
  });

  return c.json(success(result));
});

// GET /tenants - list user's tenants
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");

  const memberships = await db
    .select({
      membership: tenantMemberships,
      tenant: tenants,
    })
    .from(tenantMemberships)
    .leftJoin(tenants, eq(tenantMemberships.tenant_id, tenants.id))
    .where(
      and(
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.status, "active"),
      ),
    );

  return c.json(success(memberships));
});

// GET /tenants/mine - list user's tenants as flat TenantWithRole[] + platformRole
app.get("/mine", authMiddleware, async (c) => {
  const user = c.get("user");

  const tenantRolePriority = sql<number>`
    CASE ${tenantMemberships.role}
      WHEN 'admin' THEN 0
      WHEN 'staff' THEN 1
      WHEN 'coach' THEN 2
      ELSE 3
    END
  `;

  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      status: tenants.status,
      settings: tenants.settings,
      branding: tenants.branding,
      paymentGateway: tenants.payment_gateway,
      createdAt: tenants.created_at,
      updatedAt: tenants.updated_at,
      role: tenantMemberships.role,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenant_id, tenants.id))
    .where(
      and(
        eq(tenantMemberships.user_id, user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .orderBy(tenantRolePriority, sql`${tenantMemberships.joined_at} DESC`);

  // Flatten JSONB fields for the client
  const normalized = rows.map((row) => {
    const settings = (row.settings ?? {}) as Record<string, unknown>;
    const branding = (row.branding ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: branding.logo as string | undefined,
      logoUrl:
        (branding.logoUrl as string | undefined) ??
        (branding.logo as string | undefined),
      industry: settings.industry as string | undefined,
      currency: (settings.currency as string | undefined) ?? "MYR",
      timezone: (settings.timezone as string | undefined) ?? "Asia/Kuala_Lumpur",
      isActive: row.status === "active" || row.status === "trial",
      plan: row.plan,
      paymentGateway: row.paymentGateway,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role,
    };
  });

  // Include platform-level role so frontend can route platform admins correctly
  const platformRole = user.role === "platform_admin" ? "platform_admin" : "user";

  return c.json(success({ tenants: normalized, platformRole }));
});

// POST /tenants/join — DISABLED: self-joining is not permitted.
// Members must be invited by a business admin.
app.post("/join", authMiddleware, async (c) => {
  return c.json(error("FORBIDDEN", "Self-joining is not permitted. Please contact the business for an invitation."), 403);
});

// GET /tenants/by-slug/:slug
app.get("/by-slug/:slug", async (c) => {
  const slug = c.req.param("slug");
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (!tenant) return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  return c.json(success(tenant));
});

// GET /tenants/:tenantId
app.get("/:tenantId", authMiddleware, async (c) => {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, c.req.param("tenantId")))
    .limit(1);
  if (!tenant) return c.json(error("NOT_FOUND", "Tenant not found"), 404);

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const branding = (tenant.branding ?? {}) as Record<string, unknown>;
  return c.json(
    success({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo: branding.logo as string | undefined,
      industry: settings.industry as string | undefined,
      currency: (settings.currency as string | undefined) ?? "MYR",
      timezone: (settings.timezone as string | undefined) ?? "Asia/Kuala_Lumpur",
      isActive: tenant.status === "active" || tenant.status === "trial",
      plan: tenant.plan,
      paymentGateway: tenant.payment_gateway,
      settings,
      branding,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    }),
  );
});

// POST /tenants
app.post(
  "/",
  authMiddleware,
  zValidator("json", CreateTenantSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // Check slug uniqueness
    const [existing] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1);
    if (existing) {
      return c.json(error("CONFLICT", "Slug already taken"), 409);
    }

    try {
      const tenantId = await TenantService.createTenant({
        name: body.name,
        slug: body.slug,
        ownerId: user.id,
      });
      return c.json(success({ tenantId }), 201);
    } catch (err) {
      return c.json(error("TENANT_ERROR", (err as Error).message), 422);
    }
  },
);

// POST /tenants/:tenantId/ensure-membership - upsert customer membership
app.post("/:tenantId/ensure-membership", authMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.req.param("tenantId");

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return c.json(error("NOT_FOUND", "Tenant not found"), 404);

  const [existing] = await db
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.user_id, user.id),
      ),
    )
    .limit(1);

  if (!existing) {
    const { generateId } = await import("@timeo/db");
    await db.insert(tenantMemberships).values({
      id: generateId(),
      tenant_id: tenantId,
      user_id: user.id,
      role: "customer",
      status: "active",
    });
  }

  return c.json(success({ ok: true }));
});

// POST /tenants/:tenantId/members - admin-side member assignment
app.post(
  "/:tenantId/members",
  authMiddleware,
  zValidator("json", AddTenantMemberSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.req.param("tenantId");
    const body = c.req.valid("json");

    // Only platform_admin or tenant admin may assign members
    const [callerMembership] = await db
      .select({ role: tenantMemberships.role })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, user.id),
          eq(tenantMemberships.status, "active"),
        ),
      )
      .limit(1);

    const isPlatformAdmin = user.role === "platform_admin";
    const isTenantAdmin =
      callerMembership?.role === "admin" ||
      callerMembership?.role === "platform_admin";

    if (!isPlatformAdmin && !isTenantAdmin) {
      return c.json(error("FORBIDDEN", "Insufficient permissions"), 403);
    }

    // Verify tenant exists
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return c.json(error("NOT_FOUND", "Tenant not found"), 404);
    }

    // Verify target user exists
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (!targetUser) {
      return c.json(error("NOT_FOUND", "User not found"), 404);
    }

    // Check for existing membership
    const [existing] = await db
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, body.userId),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(error("CONFLICT", "User is already a member"), 409);
    }

    const { generateId } = await import("@timeo/db");
    const memberId = generateId();
    await db.insert(tenantMemberships).values({
      id: memberId,
      tenant_id: tenantId,
      user_id: body.userId,
      role: body.role,
      status: "active",
      notes: body.notes,
    });

    return c.json(success({ memberId }), 201);
  },
);

// PATCH /tenants/:tenantId/settings
app.patch(
  "/:tenantId/settings",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_tenant"),
  zValidator("json", UpdateTenantSettingsSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      await TenantService.updateTenantSettings(tenantId, body, user.id);
      return c.json(success({ message: "Settings updated" }));
    } catch (err) {
      return c.json(error("TENANT_ERROR", (err as Error).message), 422);
    }
  },
);

// PATCH /tenants/:tenantId/branding
app.patch(
  "/:tenantId/branding",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_tenant"),
  zValidator("json", UpdateTenantBrandingSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      await TenantService.updateTenantBranding(tenantId, body, user.id);
      return c.json(success({ message: "Branding updated" }));
    } catch (err) {
      return c.json(error("TENANT_ERROR", (err as Error).message), 422);
    }
  },
);

// GET /tenants/:tenantId/feature-flags — merged flags for tenant
app.get(
  "/:tenantId/feature-flags",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.req.param("tenantId");

    const effectiveFlags = await getEffectiveFeatureFlags(tenantId);

    const flags = Object.fromEntries(
      effectiveFlags.map((flag) => [flag.key, flag.enabled]),
    );
    const sources = Object.fromEntries(
      effectiveFlags.map((flag) => [flag.key, flag.source]),
    );

    return c.json(
      success({
        flags,
        sources,
        details: effectiveFlags,
      }),
    );
  },
);

// PATCH /tenants/:tenantId/feature-flags — set or clear tenant override
app.patch(
  "/:tenantId/feature-flags",
  authMiddleware,
  tenantMiddleware,
  requireCapability("manage_tenant"),
  zValidator(
    "json",
    z.object({
      key: z.string().min(1),
      enabled: z.boolean().optional(),
      clearOverride: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const tenantId = c.req.param("tenantId");
    const body = c.req.valid("json");

    const [flag] = await db
      .select({ id: featureFlags.id, key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.key, body.key))
      .limit(1);

    if (!flag) {
      return c.json(error("NOT_FOUND", "Feature flag not found"), 404);
    }

    const [existingOverride] = await db
      .select({ id: featureFlagOverrides.id })
      .from(featureFlagOverrides)
      .where(
        and(
          eq(featureFlagOverrides.tenant_id, tenantId),
          eq(featureFlagOverrides.feature_flag_id, flag.id),
        ),
      )
      .limit(1);

    if (body.clearOverride) {
      if (existingOverride) {
        await db
          .delete(featureFlagOverrides)
          .where(eq(featureFlagOverrides.id, existingOverride.id));
      }
    } else {
      const nextValue = body.enabled ?? false;

      if (existingOverride) {
        await db
          .update(featureFlagOverrides)
          .set({ enabled: nextValue })
          .where(eq(featureFlagOverrides.id, existingOverride.id));
      } else {
        await db.insert(featureFlagOverrides).values({
          id: generateId(),
          feature_flag_id: flag.id,
          tenant_id: tenantId,
          enabled: nextValue,
        });
      }
    }

    const effectiveFlags = await getEffectiveFeatureFlags(tenantId);
    const flags = Object.fromEntries(
      effectiveFlags.map((item) => [item.key, item.enabled]),
    );
    const sources = Object.fromEntries(
      effectiveFlags.map((item) => [item.key, item.source]),
    );

    return c.json(
      success({
        flags,
        sources,
        details: effectiveFlags,
      }),
    );
  },
);


// GET /tenants/:tenantId/settings/payments — get payment method settings
app.get(
  "/:tenantId/settings/payments",
  authMiddleware,
  tenantMiddleware,
  requireCapability("billing_strategic"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const [row] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const settings = (row?.settings ?? {}) as Record<string, unknown>;
    const paymentMethods = (settings.paymentMethods ?? {
      fpx: true,
      duitnow: true,
      card: false,
      cash: true,
    }) as Record<string, boolean>;
    return c.json(success({ paymentMethods }));
  }
);

// PATCH /tenants/:tenantId/settings/payments — save payment method settings
app.patch(
  "/:tenantId/settings/payments",
  authMiddleware,
  tenantMiddleware,
  requireCapability("billing_strategic"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json() as { paymentMethods?: Record<string, boolean> };
    const currentSettings = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const existingSettings = (currentSettings[0]?.settings ?? {}) as Record<string, unknown>;
    const updatedSettings = { ...existingSettings, paymentMethods: body.paymentMethods ?? {} };
    await db.update(tenants).set({ settings: updatedSettings }).where(eq(tenants.id, tenantId));
    return c.json(success({ message: "Payment settings updated" }));
  }
);


export { app as tenantsRouter };
