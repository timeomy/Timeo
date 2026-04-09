import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  generateId,
  normalizeIndustry,
  runTenantTemplateMigration,
  TEMPLATE_MIGRATION_WRITE_ALLOWLIST,
} from "@timeo/db";
import {
  tenantTemplateAssignments,
  tenantTemplates,
  tenantTemplateVersions,
  tenantUiOverrides,
  tenants,
} from "@timeo/db/schema";
import { TEMPLATE_INDUSTRIES } from "@timeo/shared";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success, error } from "../../lib/response.js";
import { tenantTemplateDefinitionSchema } from "../../lib/template-schema.js";
import { resolveTenantUiConfig } from "../../services/template-resolver.js";
import { getClientIp, insertAudit } from "./helpers.js";

const templateWriteAllowlist = new Set([
  "tenant_templates",
  "tenant_template_versions",
  "tenant_template_assignments",
  "tenant_ui_overrides",
]);

const migrationWriteAllowlistSet = new Set<string>(
  TEMPLATE_MIGRATION_WRITE_ALLOWLIST,
);

function assertTemplateWriteAllowed(tableName: string) {
  if (!templateWriteAllowlist.has(tableName)) {
    throw new Error(
      `Blocked write: table \"${tableName}\" is not in template write allowlist`,
    );
  }
}

function assertMigrationAllowlist(confirmWriteTables?: string[]) {
  if (!confirmWriteTables || confirmWriteTables.length === 0) {
    return;
  }

  const requestedSet = new Set(confirmWriteTables);
  if (requestedSet.size !== migrationWriteAllowlistSet.size) {
    throw new Error(
      `Invalid write allowlist. Expected exactly: ${TEMPLATE_MIGRATION_WRITE_ALLOWLIST.join(", ")}`,
    );
  }

  for (const tableName of requestedSet) {
    if (!migrationWriteAllowlistSet.has(tableName)) {
      throw new Error(`Invalid write allowlist table: ${tableName}`);
    }
  }
}

const createTemplateSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/),
  industry: z.enum(TEMPLATE_INDUSTRIES),
  name: z.string().min(1).max(200),
});

const createTemplateVersionSchema = z.object({
  definition: tenantTemplateDefinitionSchema,
});

const assignTemplateSchema = z.object({
  templateId: z.string().min(1),
  version: z.number().int().min(1).optional(),
  isPinned: z.boolean().default(false),
});

const migrationRequestSchema = z
  .object({
    confirmWriteTables: z.array(z.string()).optional(),
  })
  .optional();

const app = new Hono();

app.use("*", authMiddleware);
app.use("*", requirePlatformAdmin);

// GET /templates — list templates with current published version
app.get("/templates", async (c) => {
  const rows = await db
    .select({
      id: tenantTemplates.id,
      key: tenantTemplates.key,
      industry: tenantTemplates.industry,
      name: tenantTemplates.name,
      status: tenantTemplates.status,
      currentVersion: tenantTemplates.current_version,
      createdBy: tenantTemplates.created_by,
      createdAt: tenantTemplates.created_at,
      updatedAt: tenantTemplates.updated_at,
      currentVersionId: tenantTemplateVersions.id,
      isPublished: tenantTemplateVersions.is_published,
      publishedAt: tenantTemplateVersions.published_at,
      schemaVersion: tenantTemplateVersions.schema_version,
    })
    .from(tenantTemplates)
    .leftJoin(
      tenantTemplateVersions,
      and(
        eq(tenantTemplateVersions.template_id, tenantTemplates.id),
        eq(tenantTemplateVersions.version, tenantTemplates.current_version),
      ),
    )
    .orderBy(tenantTemplates.industry, tenantTemplates.key);

  return c.json(
    success(
      rows.map((row) => ({
        id: row.id,
        key: row.key,
        industry: row.industry,
        name: row.name,
        status: row.status,
        currentVersion: row.currentVersion,
        currentVersionId: row.currentVersionId,
        currentVersionPublished: row.isPublished ?? false,
        publishedAt: row.publishedAt,
        schemaVersion: row.schemaVersion,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    ),
  );
});

// POST /templates — create template draft
app.post(
  "/templates",
  zValidator("json", createTemplateSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select({ id: tenantTemplates.id })
      .from(tenantTemplates)
      .where(eq(tenantTemplates.key, body.key))
      .limit(1);

    if (existing) {
      return c.json(error("KEY_EXISTS", "Template key already exists"), 409);
    }

    assertTemplateWriteAllowed("tenant_templates");

    const templateId = generateId();
    await db.insert(tenantTemplates).values({
      id: templateId,
      key: body.key,
      industry: body.industry,
      name: body.name,
      status: "draft",
      current_version: 0,
      created_by: user.id,
      updated_at: new Date(),
    });

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant_template.created",
      "tenant_template",
      templateId,
      { key: body.key, industry: body.industry, name: body.name },
      ip,
    );

    const [created] = await db
      .select()
      .from(tenantTemplates)
      .where(eq(tenantTemplates.id, templateId))
      .limit(1);

    return c.json(success(created), 201);
  },
);

// GET /templates/:templateId — detail with versions
app.get("/templates/:templateId", async (c) => {
  const templateId = c.req.param("templateId");

  const [template, versions] = await Promise.all([
    db
      .select()
      .from(tenantTemplates)
      .where(eq(tenantTemplates.id, templateId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: tenantTemplateVersions.id,
        templateId: tenantTemplateVersions.template_id,
        version: tenantTemplateVersions.version,
        schemaVersion: tenantTemplateVersions.schema_version,
        definition: tenantTemplateVersions.definition,
        isPublished: tenantTemplateVersions.is_published,
        publishedBy: tenantTemplateVersions.published_by,
        publishedAt: tenantTemplateVersions.published_at,
        createdAt: tenantTemplateVersions.created_at,
      })
      .from(tenantTemplateVersions)
      .where(eq(tenantTemplateVersions.template_id, templateId))
      .orderBy(desc(tenantTemplateVersions.version)),
  ]);

  if (!template) {
    return c.json(error("NOT_FOUND", "Template not found"), 404);
  }

  return c.json(
    success({
      ...template,
      versions,
    }),
  );
});

// POST /templates/:templateId/versions — create draft version
app.post(
  "/templates/:templateId/versions",
  zValidator("json", createTemplateVersionSchema),
  async (c) => {
    const templateId = c.req.param("templateId");
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [template, latestVersion] = await Promise.all([
      db
        .select()
        .from(tenantTemplates)
        .where(eq(tenantTemplates.id, templateId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ version: tenantTemplateVersions.version })
        .from(tenantTemplateVersions)
        .where(eq(tenantTemplateVersions.template_id, templateId))
        .orderBy(desc(tenantTemplateVersions.version))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!template) {
      return c.json(error("NOT_FOUND", "Template not found"), 404);
    }

    if (body.definition.templateKey !== template.key) {
      return c.json(
        error("VALIDATION_ERROR", "definition.templateKey must match template key"),
        422,
      );
    }

    if (body.definition.industry !== template.industry) {
      return c.json(
        error("VALIDATION_ERROR", "definition.industry must match template industry"),
        422,
      );
    }

    assertTemplateWriteAllowed("tenant_template_versions");
    assertTemplateWriteAllowed("tenant_templates");

    const version = (latestVersion?.version ?? 0) + 1;
    const versionId = generateId();
    await db.insert(tenantTemplateVersions).values({
      id: versionId,
      template_id: templateId,
      version,
      schema_version: body.definition.schemaVersion,
      definition: body.definition,
      is_published: false,
    });

    await db
      .update(tenantTemplates)
      .set({
        updated_at: new Date(),
      })
      .where(eq(tenantTemplates.id, templateId));

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant_template.version_created",
      "tenant_template_version",
      versionId,
      { templateId, version },
      ip,
    );

    const [created] = await db
      .select()
      .from(tenantTemplateVersions)
      .where(eq(tenantTemplateVersions.id, versionId))
      .limit(1);

    return c.json(success(created), 201);
  },
);

// POST /templates/:templateId/versions/:version/publish — publish version
app.post(
  "/templates/:templateId/versions/:version/publish",
  async (c) => {
    const templateId = c.req.param("templateId");
    const versionValue = Number(c.req.param("version"));
    const user = c.get("user");
    const ip = getClientIp(c.req.raw.headers);

    if (!Number.isInteger(versionValue) || versionValue <= 0) {
      return c.json(error("VALIDATION_ERROR", "version must be a positive integer"), 422);
    }

    const [template, versionRow] = await Promise.all([
      db
        .select()
        .from(tenantTemplates)
        .where(eq(tenantTemplates.id, templateId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select()
        .from(tenantTemplateVersions)
        .where(
          and(
            eq(tenantTemplateVersions.template_id, templateId),
            eq(tenantTemplateVersions.version, versionValue),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!template) {
      return c.json(error("NOT_FOUND", "Template not found"), 404);
    }

    if (!versionRow) {
      return c.json(error("NOT_FOUND", "Template version not found"), 404);
    }

    const parsedDefinition = tenantTemplateDefinitionSchema.safeParse(
      versionRow.definition,
    );
    if (!parsedDefinition.success) {
      return c.json(
        error(
          "VALIDATION_ERROR",
          parsedDefinition.error.issues[0]?.message ??
            "Template definition is invalid",
        ),
        422,
      );
    }

    if (parsedDefinition.data.templateKey !== template.key) {
      return c.json(
        error("VALIDATION_ERROR", "definition.templateKey must match template key"),
        422,
      );
    }

    if (parsedDefinition.data.industry !== template.industry) {
      return c.json(
        error("VALIDATION_ERROR", "definition.industry must match template industry"),
        422,
      );
    }

    assertTemplateWriteAllowed("tenant_template_versions");
    assertTemplateWriteAllowed("tenant_templates");

    await db
      .update(tenantTemplateVersions)
      .set({ is_published: false })
      .where(eq(tenantTemplateVersions.template_id, templateId));

    await db
      .update(tenantTemplateVersions)
      .set({
        is_published: true,
        published_by: user.id,
        published_at: new Date(),
      })
      .where(eq(tenantTemplateVersions.id, versionRow.id));

    await db
      .update(tenantTemplates)
      .set({
        status: "published",
        current_version: versionValue,
        updated_at: new Date(),
      })
      .where(eq(tenantTemplates.id, templateId));

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant_template.version_published",
      "tenant_template_version",
      versionRow.id,
      { templateId, version: versionValue },
      ip,
    );

    const [published] = await db
      .select()
      .from(tenantTemplateVersions)
      .where(eq(tenantTemplateVersions.id, versionRow.id))
      .limit(1);

    return c.json(success(published));
  },
);

// GET /tenants/:tenantId/template — assignment + resolved config
app.get("/tenants/:tenantId/template", async (c) => {
  const tenantId = c.req.param("tenantId");

  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return c.json(error("NOT_FOUND", "Tenant not found"), 404);
  }

  const resolved = await resolveTenantUiConfig(tenantId);

  return c.json(
    success({
      tenant,
      assignment: resolved.assignment,
      templateDefinition: resolved.templateDefinition,
      resolvedConfig: {
        memberPortal: resolved.memberPortal,
        adminPanel: resolved.adminPanel,
        featureDefaults: resolved.featureDefaults,
      },
      overrides: {
        memberPortal: resolved.memberOverride,
        adminPanel: resolved.adminOverride,
        revision: resolved.overrideRevision,
      },
    }),
  );
});

// POST /tenants/:tenantId/template/assign — assign/reassign template
app.post(
  "/tenants/:tenantId/template/assign",
  zValidator("json", assignTemplateSchema),
  async (c) => {
    const tenantId = c.req.param("tenantId");
    const user = c.get("user");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [tenant, template] = await Promise.all([
      db
        .select({ id: tenants.id, settings: tenants.settings, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select()
        .from(tenantTemplates)
        .where(eq(tenantTemplates.id, body.templateId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!tenant) {
      return c.json(error("NOT_FOUND", "Tenant not found"), 404);
    }

    if (!template) {
      return c.json(error("NOT_FOUND", "Template not found"), 404);
    }

    const [targetVersion] = body.version
      ? await db
          .select({
            id: tenantTemplateVersions.id,
            version: tenantTemplateVersions.version,
          })
          .from(tenantTemplateVersions)
          .where(
            and(
              eq(tenantTemplateVersions.template_id, template.id),
              eq(tenantTemplateVersions.version, body.version),
            ),
          )
          .limit(1)
      : await db
          .select({
            id: tenantTemplateVersions.id,
            version: tenantTemplateVersions.version,
          })
          .from(tenantTemplateVersions)
          .where(
            and(
              eq(tenantTemplateVersions.template_id, template.id),
              eq(tenantTemplateVersions.version, template.current_version),
              eq(tenantTemplateVersions.is_published, true),
            ),
          )
          .limit(1);

    if (!targetVersion) {
      return c.json(
        error(
          "NO_PUBLISHED_VERSION",
          "Template has no published version available for assignment",
        ),
        422,
      );
    }

    assertTemplateWriteAllowed("tenant_template_assignments");
    assertTemplateWriteAllowed("tenant_ui_overrides");

    const [existingAssignment] = await db
      .select({ id: tenantTemplateAssignments.id })
      .from(tenantTemplateAssignments)
      .where(eq(tenantTemplateAssignments.tenant_id, tenantId))
      .limit(1);

    const normalizedIndustry = normalizeIndustry(
      typeof (tenant.settings as Record<string, unknown> | null)?.industry ===
        "string"
        ? ((tenant.settings as Record<string, unknown>).industry as string)
        : null,
    );

    if (existingAssignment) {
      await db
        .update(tenantTemplateAssignments)
        .set({
          template_id: template.id,
          template_version_id: targetVersion.id,
          industry_snapshot: normalizedIndustry ?? template.industry,
          source: "platform_assignment",
          is_pinned: body.isPinned,
          applied_by: user.id,
          applied_at: new Date(),
        })
        .where(eq(tenantTemplateAssignments.id, existingAssignment.id));
    } else {
      await db.insert(tenantTemplateAssignments).values({
        id: generateId(),
        tenant_id: tenantId,
        template_id: template.id,
        template_version_id: targetVersion.id,
        industry_snapshot: normalizedIndustry ?? template.industry,
        source: "platform_assignment",
        is_pinned: body.isPinned,
        applied_by: user.id,
        applied_at: new Date(),
      });
    }

    const [existingOverrideRow] = await db
      .select({ id: tenantUiOverrides.id })
      .from(tenantUiOverrides)
      .where(eq(tenantUiOverrides.tenant_id, tenantId))
      .limit(1);

    if (!existingOverrideRow) {
      await db.insert(tenantUiOverrides).values({
        id: generateId(),
        tenant_id: tenantId,
        member_portal_override: {},
        admin_panel_override: {},
        revision: 0,
        updated_by: user.id,
      });
    }

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant_template.assigned",
      "tenant_template_assignment",
      tenantId,
      {
        tenantId,
        templateId: template.id,
        templateVersionId: targetVersion.id,
        version: targetVersion.version,
        isPinned: body.isPinned,
      },
      ip,
      tenantId,
    );

    const resolved = await resolveTenantUiConfig(tenantId);
    return c.json(
      success({
        assignment: resolved.assignment,
        resolvedConfig: {
          memberPortal: resolved.memberPortal,
          adminPanel: resolved.adminPanel,
          featureDefaults: resolved.featureDefaults,
        },
      }),
    );
  },
);

// POST /template-migrations/preview — dry-run existing migration logic
app.post(
  "/template-migrations/preview",
  zValidator("json", migrationRequestSchema),
  async (c) => {
    const body = c.req.valid("json");

    try {
      assertMigrationAllowlist(body?.confirmWriteTables);
    } catch (err) {
      return c.json(error("VALIDATION_ERROR", (err as Error).message), 422);
    }

    const report = await runTenantTemplateMigration({ execute: false });
    return c.json(success(report));
  },
);

// POST /template-migrations/execute — execute migration (allowlist enforced)
app.post(
  "/template-migrations/execute",
  zValidator("json", migrationRequestSchema),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const ip = getClientIp(c.req.raw.headers);

    try {
      assertMigrationAllowlist(body?.confirmWriteTables);
    } catch (err) {
      return c.json(error("VALIDATION_ERROR", (err as Error).message), 422);
    }

    const report = await runTenantTemplateMigration({ execute: true });

    await insertAudit(
      user.id,
      "platform_admin",
      "tenant_template.migration_executed",
      "tenant_template_assignment",
      undefined,
      {
        summary: report.summary,
        assignmentActions: report.assignmentActions,
      },
      ip,
    );

    return c.json(success(report));
  },
);

export { app as platformTemplatesRouter };
