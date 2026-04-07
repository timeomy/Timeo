import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db, generateId } from "@timeo/db";
import {
  memberships,
  subscriptions,
  tenantMemberships,
  users,
} from "@timeo/db/schema";
import { authMiddleware } from "../middleware/auth.js";
import { requirePlatformAdmin } from "../middleware/rbac.js";
import { error, success } from "../lib/response.js";

const app = new Hono();

const WSFITNESS_TENANT_ID = "7Kw87VeAnXg4qDXi6UTbu";
const AVATAR_STORAGE_DIR =
  process.env.TIMEO_AVATAR_STORAGE_DIR ?? "/opt/timeo-website/avatars";
const AVATAR_PUBLIC_BASE_URL = (
  process.env.TIMEO_AVATAR_PUBLIC_BASE_URL ?? "https://timeo.my/avatars"
).replace(/\/$/, "");
const MAX_FACE_IMAGE_BYTES = 8 * 1024 * 1024;

const imageMimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const WsFitnessMemberSchema = z
  .object({
    externalId: z
      .union([z.string(), z.number()])
      .transform((value) => String(value).trim()),
    cardNo: z.string().optional().nullable(),
    legacyUserId: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((value) =>
        value === null || value === undefined ? null : String(value),
      ),
    name: z.string().min(1).max(200),
    email: z.string().email().optional().nullable(),
    planName: z.string().min(1).max(200),
    price: z.coerce.number().min(0),
    expiryDate: z.string().min(1),
    startDate: z.string().min(1).optional().nullable(),
    ticketType: z.string().optional().nullable(),
    personId: z.string().optional().nullable(),
    faceImageBase64: z.string().optional().nullable(),
  })
  .superRefine((member, ctx) => {
    if (!member.externalId) {
      ctx.addIssue({
        path: ["externalId"],
        code: z.ZodIssueCode.custom,
        message: "externalId is required",
      });
    }
  });

const WsFitnessBulkSchema = z.array(WsFitnessMemberSchema).min(1).max(2000);

function normalizeEmail(email: string | null | undefined, externalId: string): string {
  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }
  return `wsfitness-${externalId}@import.timeo.local`;
}

function inferInterval(planName: string): "monthly" | "yearly" {
  const normalized = planName.toLowerCase();
  if (
    normalized.includes("year") ||
    normalized.includes("annual") ||
    normalized.includes("12m")
  ) {
    return "yearly";
  }
  return "monthly";
}

function toPlanKey(name: string, priceCents: number): string {
  return `${name.trim().toLowerCase()}::${priceCents}`;
}

function toPriceCents(price: number): number {
  return Math.round(price * 100);
}

function parseDateValue(raw: string, field: string): Date {
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid ${field}: ${raw}`);
  }
  return value;
}

function decodeFaceImage(base64OrDataUrl: string): {
  bytes: Buffer;
  extension: string;
} {
  let base64Payload = base64OrDataUrl.trim();
  let mimeType = "image/jpeg";

  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(
    base64Payload,
  );
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    base64Payload = dataUrlMatch[2];
  }

  const normalizedBase64 = base64Payload
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const bytes = Buffer.from(normalizedBase64, "base64");
  if (!bytes.length) {
    throw new Error("Face image is empty after base64 decode");
  }
  if (bytes.length > MAX_FACE_IMAGE_BYTES) {
    throw new Error("Face image exceeds max allowed size (8MB)");
  }

  const extension = imageMimeToExt[mimeType] ?? "jpg";

  return { bytes, extension };
}

async function persistAvatar(
  externalId: string,
  faceImageBase64: string,
): Promise<string> {
  const { bytes, extension } = decodeFaceImage(faceImageBase64);
  const safeExternalId = externalId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `wsfitness-${safeExternalId}.${extension}`;

  await fs.mkdir(AVATAR_STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(AVATAR_STORAGE_DIR, filename), bytes);

  return `${AVATAR_PUBLIC_BASE_URL}/${filename}`;
}

// POST /api/admin/migration/wsfitness/members
app.post(
  "/members",
  authMiddleware,
  requirePlatformAdmin,
  zValidator("json", WsFitnessBulkSchema),
  async (c) => {
    const payload = c.req.valid("json");

    const existingPlans = await db
      .select({
        id: memberships.id,
        name: memberships.name,
        price: memberships.price,
      })
      .from(memberships)
      .where(eq(memberships.tenant_id, WSFITNESS_TENANT_ID));

    const plansByKey = new Map(
      existingPlans.map((plan) => [toPlanKey(plan.name, plan.price), plan]),
    );

    let createdUsers = 0;
    let updatedUsers = 0;
    let createdMembers = 0;
    let updatedMembers = 0;
    let createdPlans = 0;
    let upsertedSubscriptions = 0;

    const errors: Array<{ externalId: string; message: string }> = [];

    for (const member of payload) {
      const externalId = member.externalId;

      try {
        const planPriceCents = toPriceCents(member.price);
        const planKey = toPlanKey(member.planName, planPriceCents);

        let plan = plansByKey.get(planKey);
        if (!plan) {
          const planId = generateId();
          await db.insert(memberships).values({
            id: planId,
            tenant_id: WSFITNESS_TENANT_ID,
            name: member.planName,
            description: `Imported from WS Fitness legacy plan (${member.planName})`,
            price: planPriceCents,
            currency: "MYR",
            interval: inferInterval(member.planName),
            duration_months: null,
            plan_type: "all_access",
            features: ["Imported from WS Fitness"],
            is_active: true,
          });

          plan = {
            id: planId,
            name: member.planName,
            price: planPriceCents,
          };
          plansByKey.set(planKey, plan);
          createdPlans++;
        }

        const [membershipByExternalId] = await db
          .select({
            id: tenantMemberships.id,
            user_id: tenantMemberships.user_id,
          })
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
              eq(tenantMemberships.member_id, externalId),
            ),
          )
          .limit(1);

        const avatarUrl = member.faceImageBase64
          ? await persistAvatar(externalId, member.faceImageBase64)
          : null;

        let userId = membershipByExternalId?.user_id;
        const memberEmail = normalizeEmail(member.email, externalId);

        if (!userId) {
          const [existingUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, memberEmail))
            .limit(1);

          if (existingUser) {
            userId = existingUser.id;
          } else {
            userId = generateId();
            await db.insert(users).values({
              id: userId,
              auth_id: null,
              email: memberEmail,
              name: member.name,
              avatar_url: avatarUrl,
              role: "user",
            });
            createdUsers++;
          }
        }

        const userUpdates: {
          name: string;
          updated_at: Date;
          avatar_url?: string;
        } = {
          name: member.name,
          updated_at: new Date(),
        };
        if (avatarUrl) {
          userUpdates.avatar_url = avatarUrl;
        }

        await db.update(users).set(userUpdates).where(eq(users.id, userId));
        updatedUsers++;

        const [membershipByUser] = await db
          .select({ id: tenantMemberships.id })
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenant_id, WSFITNESS_TENANT_ID),
              eq(tenantMemberships.user_id, userId),
            ),
          )
          .limit(1);

        const joinedAt = member.startDate
          ? parseDateValue(member.startDate, "startDate")
          : new Date();
        const membershipNote = member.personId
          ? `wsfitness_card=${externalId};person_id=${member.personId}`
          : `wsfitness_card=${externalId}`;

        if (membershipByUser) {
          await db
            .update(tenantMemberships)
            .set({
              role: "customer",
              status: "active",
              member_id: externalId,
              joined_at: joinedAt,
              notes: membershipNote,
            })
            .where(eq(tenantMemberships.id, membershipByUser.id));
          updatedMembers++;
        } else {
          await db.insert(tenantMemberships).values({
            id: generateId(),
            user_id: userId,
            tenant_id: WSFITNESS_TENANT_ID,
            role: "customer",
            status: "active",
            member_id: externalId,
            joined_at: joinedAt,
            notes: membershipNote,
          });
          createdMembers++;
        }

        const periodStart = member.startDate
          ? parseDateValue(member.startDate, "startDate")
          : new Date();
        const periodEnd = parseDateValue(member.expiryDate, "expiryDate");
        const subscriptionStatus =
          periodEnd.getTime() > Date.now() ? "active" : "canceled";

        const [existingSubscription] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.tenant_id, WSFITNESS_TENANT_ID),
              eq(subscriptions.customer_id, userId),
            ),
          )
          .orderBy(desc(subscriptions.created_at))
          .limit(1);

        if (existingSubscription) {
          await db
            .update(subscriptions)
            .set({
              membership_id: plan.id,
              status: subscriptionStatus,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              updated_at: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        } else {
          await db.insert(subscriptions).values({
            id: generateId(),
            tenant_id: WSFITNESS_TENANT_ID,
            customer_id: userId,
            membership_id: plan.id,
            status: subscriptionStatus,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          });
        }

        upsertedSubscriptions++;
      } catch (err) {
        errors.push({
          externalId,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (errors.length === payload.length) {
      return c.json(error("MIGRATION_FAILED", "All members failed to import"), 500);
    }

    return c.json(
      success({
        tenantId: WSFITNESS_TENANT_ID,
        total: payload.length,
        failures: errors.length,
        createdUsers,
        updatedUsers,
        createdMembers,
        updatedMembers,
        createdPlans,
        upsertedSubscriptions,
        errors,
      }),
    );
  },
);

export { app as wsFitnessMigrationRouter };
