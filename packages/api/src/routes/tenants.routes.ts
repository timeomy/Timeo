import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { tenants, tenantMemberships } from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";
import {
  CreateTenantSchema,
  UpdateTenantSettingsSchema,
} from "../lib/validation.js";
import * as TenantService from "../services/tenant.service.js";

const app = new Hono();

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

// GET /tenants/mine - list user's tenants as flat TenantWithRole[]
app.get("/mine", authMiddleware, async (c) => {
  const user = c.get("user");

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
    );

  // Flatten JSONB fields for the client
  const normalized = rows.map((row) => {
    const settings = (row.settings ?? {}) as Record<string, unknown>;
    const branding = (row.branding ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: branding.logo as string | undefined,
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

  return c.json(success(normalized));
});

// POST /tenants/join - join a tenant as a customer (by slug)
app.post("/join", authMiddleware, async (c) => {
  const user = c.get("user");
  const { slug } = await c.req.json().catch(() => ({ slug: "" }));

  if (!slug) {
    return c.json(error("VALIDATION_ERROR", "slug is required"), 400);
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Business not found"), 404);
  }

  // Upsert customer membership
  const [existing] = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenant.id),
        eq(tenantMemberships.user_id, user.id),
      ),
    )
    .limit(1);

  if (!existing) {
    const { generateId } = await import("@timeo/db");
    await db.insert(tenantMemberships).values({
      id: generateId(),
      tenant_id: tenant.id,
      user_id: user.id,
      role: "customer",
      status: "active",
    });
  }

  return c.json(success({ tenantId: tenant.id, tenantName: tenant.name }));
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

// PATCH /tenants/:tenantId/settings
app.patch(
  "/:tenantId/settings",
  authMiddleware,
  zValidator("json", UpdateTenantSettingsSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.req.param("tenantId");
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
app.patch("/:tenantId/branding", authMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json();

  try {
    await TenantService.updateTenantBranding(tenantId, body, user.id);
    return c.json(success({ message: "Branding updated" }));
  } catch (err) {
    return c.json(error("TENANT_ERROR", (err as Error).message), 422);
  }
});

export { app as tenantsRouter };
