import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, generateId } from "@timeo/db";
import { emailTemplates } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";
import { insertAudit, getClientIp } from "./helpers.js";

const app = new Hono();

// GET /email-templates — list all
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const rows = await db.select().from(emailTemplates);
  return c.json(success(rows));
});

// PUT /email-templates/:key — upsert template by key
app.put(
  "/:key",
  authMiddleware,
  requirePlatformAdmin,
  zValidator(
    "json",
    z.object({
      subject: z.string().min(1).max(200),
      body_html: z.string().min(1),
      body_text: z.string().optional(),
      variables: z
        .array(z.object({ name: z.string(), description: z.string() }))
        .default([]),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const key = c.req.param("key");
    const body = c.req.valid("json");
    const ip = getClientIp(c.req.raw.headers);

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(emailTemplates)
        .set({
          subject: body.subject,
          body_html: body.body_html,
          body_text: body.body_text,
          variables: body.variables,
          updated_at: new Date(),
        })
        .where(eq(emailTemplates.id, existing.id));
    } else {
      await db.insert(emailTemplates).values({
        id: generateId(),
        key,
        subject: body.subject,
        body_html: body.body_html,
        body_text: body.body_text,
        variables: body.variables,
      });
    }

    await insertAudit(
      user.id,
      "platform_admin",
      "email_template.upserted",
      "email_template",
      key,
      { subject: body.subject },
      ip,
    );

    return c.json(success({ message: "Template saved" }));
  },
);

export { app as emailTemplatesRouter };
