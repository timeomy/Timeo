import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, generateId } from "@timeo/db";
import { tenantUiOverrides } from "@timeo/db/schema";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success } from "../lib/response.js";
import {
  adminPanelOverrideSchema,
  memberPortalOverrideSchema,
} from "../lib/template-schema.js";
import { resolveTenantUiConfig } from "../services/template-resolver.js";

const updateMemberOverrideSchema = z.object({
  override: memberPortalOverrideSchema,
});

const updateAdminOverrideSchema = z.object({
  override: adminPanelOverrideSchema,
});

const resetScopeSchema = z.object({
  scope: z.enum(["member", "admin", "all"]),
});

const app = new Hono();

app.use("*", authMiddleware, tenantMiddleware, requireRole("admin"));

async function saveOverride(
  tenantId: string,
  userId: string,
  payload: {
    memberPortalOverride?: Record<string, unknown>;
    adminPanelOverride?: Record<string, unknown>;
  },
) {
  const [existing] = await db
    .select({
      id: tenantUiOverrides.id,
      memberPortalOverride: tenantUiOverrides.member_portal_override,
      adminPanelOverride: tenantUiOverrides.admin_panel_override,
      revision: tenantUiOverrides.revision,
    })
    .from(tenantUiOverrides)
    .where(eq(tenantUiOverrides.tenant_id, tenantId))
    .limit(1);

  const nextMemberOverride =
    payload.memberPortalOverride ??
    ((existing?.memberPortalOverride as Record<string, unknown> | undefined) ?? {});
  const nextAdminOverride =
    payload.adminPanelOverride ??
    ((existing?.adminPanelOverride as Record<string, unknown> | undefined) ?? {});

  if (!existing) {
    await db.insert(tenantUiOverrides).values({
      id: generateId(),
      tenant_id: tenantId,
      member_portal_override: nextMemberOverride,
      admin_panel_override: nextAdminOverride,
      revision: 1,
      updated_by: userId,
      updated_at: new Date(),
    });
    return;
  }

  await db
    .update(tenantUiOverrides)
    .set({
      member_portal_override: nextMemberOverride,
      admin_panel_override: nextAdminOverride,
      revision: (existing.revision ?? 0) + 1,
      updated_by: userId,
      updated_at: new Date(),
    })
    .where(eq(tenantUiOverrides.id, existing.id));
}

// GET /member — resolved member portal config
app.get("/member", async (c) => {
  const tenantId = c.get("tenantId");
  const resolved = await resolveTenantUiConfig(tenantId);

  return c.json(
    success({
      tenantId,
      assignment: resolved.assignment,
      resolved: resolved.memberPortal,
      override: resolved.memberOverride,
      revision: resolved.overrideRevision,
    }),
  );
});

// PATCH /member — update member override jsonb
app.patch(
  "/member",
  zValidator("json", updateMemberOverrideSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const body = c.req.valid("json");

    await saveOverride(tenantId, user.id, {
      memberPortalOverride: body.override as Record<string, unknown>,
    });

    const resolved = await resolveTenantUiConfig(tenantId);
    return c.json(
      success({
        tenantId,
        assignment: resolved.assignment,
        resolved: resolved.memberPortal,
        override: resolved.memberOverride,
        revision: resolved.overrideRevision,
      }),
    );
  },
);

// GET /admin — resolved admin panel config
app.get("/admin", async (c) => {
  const tenantId = c.get("tenantId");
  const resolved = await resolveTenantUiConfig(tenantId);

  return c.json(
    success({
      tenantId,
      assignment: resolved.assignment,
      resolved: resolved.adminPanel,
      override: resolved.adminOverride,
      revision: resolved.overrideRevision,
    }),
  );
});

// PATCH /admin — update admin override jsonb
app.patch(
  "/admin",
  zValidator("json", updateAdminOverrideSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const body = c.req.valid("json");

    await saveOverride(tenantId, user.id, {
      adminPanelOverride: body.override as Record<string, unknown>,
    });

    const resolved = await resolveTenantUiConfig(tenantId);
    return c.json(
      success({
        tenantId,
        assignment: resolved.assignment,
        resolved: resolved.adminPanel,
        override: resolved.adminOverride,
        revision: resolved.overrideRevision,
      }),
    );
  },
);

// POST /reset — reset overrides by scope
app.post("/reset", zValidator("json", resetScopeSchema), async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const { scope } = c.req.valid("json");

  if (scope === "member") {
    await saveOverride(tenantId, user.id, {
      memberPortalOverride: {},
    });
  } else if (scope === "admin") {
    await saveOverride(tenantId, user.id, {
      adminPanelOverride: {},
    });
  } else {
    await saveOverride(tenantId, user.id, {
      memberPortalOverride: {},
      adminPanelOverride: {},
    });
  }

  const resolved = await resolveTenantUiConfig(tenantId);
  return c.json(
    success({
      tenantId,
      assignment: resolved.assignment,
      resolved: {
        memberPortal: resolved.memberPortal,
        adminPanel: resolved.adminPanel,
      },
      overrides: {
        memberPortal: resolved.memberOverride,
        adminPanel: resolved.adminOverride,
      },
      revision: resolved.overrideRevision,
    }),
  );
});

export { app as uiConfigRouter };
