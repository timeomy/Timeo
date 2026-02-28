import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import { files } from "@timeo/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateFileMetadataSchema } from "../lib/validation.js";

const app = new Hono();

// GET /tenants/:tenantId/files
app.get("/", authMiddleware, tenantMiddleware, async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.tenant_id, tenantId))
    .orderBy(desc(files.created_at));
  return c.json(success(rows));
});

// POST /tenants/:tenantId/files (metadata only - actual upload handled elsewhere)
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", CreateFileMetadataSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.insert(files).values({
      id,
      tenant_id: tenantId,
      uploaded_by: user.id,
      storage_id: body.storageId,
      filename: body.filename,
      mime_type: body.mimeType,
      size: body.size,
      type: body.type,
      entity_id: body.entityId ?? null,
    });

    return c.json(success({ id }), 201);
  },
);

// DELETE /tenants/:tenantId/files/:fileId
app.delete(
  "/:fileId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const fileId = c.req.param("fileId");
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);
    if (!file) return c.json(error("NOT_FOUND", "File not found"), 404);

    await db.delete(files).where(eq(files.id, fileId));
    return c.json(success({ message: "File deleted" }));
  },
);

export { app as filesRouter };
