import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  users,
  tenantMemberships,
  sessionLogs,
  coachAvailability,
  coachBookings,
  subscriptions,
  memberships,
  exercises,
  coachClientNotes,
} from "@timeo/db/schema";
import { and, eq, desc, or, sql, inArray, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability, requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { generateId } from "@timeo/db";

const app = new Hono();

// ── GET /coaches/exercises — list exercises by training type ─────────────────
app.get(
  "/exercises",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const typesParam = c.req.query("types");

    try {
      let query = db
        .select()
        .from(exercises)
        .where(eq(exercises.tenant_id, tenantId));

      const rows = await (typesParam
        ? db
            .select()
            .from(exercises)
            .where(
              and(
                eq(exercises.tenant_id, tenantId),
                inArray(
                  exercises.training_type,
                  typesParam.split(",").map((t) => t.trim()).filter(Boolean),
                ),
              ),
            )
            .orderBy(exercises.training_type, exercises.name)
        : db
            .select()
            .from(exercises)
            .where(eq(exercises.tenant_id, tenantId))
            .orderBy(exercises.training_type, exercises.name));

      return c.json(success(rows));
    } catch (err) {
      return c.json(error("EXERCISES_ERROR", (err as Error).message), 500);
    }
  },
);

// ── POST /coaches/exercises — add custom exercise ────────────────────────────
app.post(
  "/exercises",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      training_type: z.enum(["pull", "push", "legs"]),
      equipment: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const id = generateId();
      await db.insert(exercises).values({
        id,
        tenant_id: tenantId,
        name: body.name,
        training_type: body.training_type,
        equipment: body.equipment ?? null,
        is_custom: true,
        created_by: user.id,
      });
      return c.json(
        success({
          id,
          name: body.name,
          training_type: body.training_type,
          equipment: body.equipment,
          is_custom: true,
        }),
        201,
      );
    } catch (err) {
      return c.json(
        error("EXERCISE_CREATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /coaches/me/clients — coach sees their assigned clients ───────────────
app.get(
  "/me/clients",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");

    try {
      const assignments = await db
        .select({
          membership: tenantMemberships,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar_url: users.avatar_url,
          },
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.coach_id, user.id),
            eq(tenantMemberships.status, "active"),
          ),
        );

      const result = await Promise.all(
        assignments.map(async (a) => {
          const ptPackages = await db
            .select({
              sub: subscriptions,
              membershipName: memberships.name,
            })
            .from(subscriptions)
            .innerJoin(
              memberships,
              eq(subscriptions.membership_id, memberships.id),
            )
            .where(
              and(
                eq(subscriptions.tenant_id, tenantId),
                eq(subscriptions.customer_id, a.user.id),
                eq(subscriptions.package_type, "pt_package"),
                eq(subscriptions.status, "active"),
              ),
            )
            .limit(1);

          const ptPkg = ptPackages[0];

          let totalSessions = 0;
          let lastSession: string | null = null;
          try {
            const logRows = await db
              .select({
                id: sessionLogs.id,
                created_at: sessionLogs.created_at,
              })
              .from(sessionLogs)
              .where(
                and(
                  eq(sessionLogs.tenant_id, tenantId),
                  eq(sessionLogs.client_id, a.user.id),
                  eq(sessionLogs.coach_id, user.id),
                ),
              )
              .orderBy(desc(sessionLogs.created_at));
            totalSessions = logRows.length;
            lastSession =
              logRows[0]?.created_at?.toISOString() ?? null;
          } catch (_e) {}

          return {
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            phone: null,
            avatar_url: a.user.avatar_url,
            membershipId: a.membership.id,
            role: a.membership.role,
            status: a.membership.status,
            totalSessions,
            lastSession: lastSession
              ? new Date(lastSession).toISOString()
              : null,
            total_classes: ptPkg?.sub.total_classes ?? null,
            remaining_classes: ptPkg?.sub.remaining_classes ?? null,
            package_name: ptPkg?.membershipName ?? null,
            package_preset: ptPkg?.sub.package_preset ?? null,
            expires_at: ptPkg?.sub.current_period_end
              ? new Date(ptPkg.sub.current_period_end)
                  .toISOString()
                  .split("T")[0]
              : null,
            subscription_id: ptPkg?.sub.id ?? null,
          };
        }),
      );

      return c.json(success(result));
    } catch (err) {
      return c.json(
        error("COACH_CLIENTS_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /coaches/me/clients/:clientId/package ─────────────────────────────────
app.get(
  "/me/clients/:clientId/package",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const clientId = c.req.param("clientId");

    try {
      const packages = await db
        .select({
          sub: subscriptions,
          membershipName: memberships.name,
        })
        .from(subscriptions)
        .innerJoin(
          memberships,
          eq(subscriptions.membership_id, memberships.id),
        )
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.customer_id, clientId),
            eq(subscriptions.package_type, "pt_package"),
            eq(subscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (!packages[0]) {
        return c.json(success(null));
      }

      const pkg = packages[0];
      return c.json(
        success({
          subscription_id: pkg.sub.id,
          total_classes: pkg.sub.total_classes,
          remaining_classes: pkg.sub.remaining_classes,
          package_name: pkg.membershipName,
          package_preset: pkg.sub.package_preset ?? null,
          status: pkg.sub.status,
          expires_at:
            pkg.sub.current_period_end
              ?.toISOString()
              ?.split("T")[0] ?? null,
        }),
      );
    } catch (err) {
      return c.json(
        error("CLIENT_PACKAGE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /coaches/me/clients/:clientId/last-weight ─────────────────────────────
app.get(
  "/me/clients/:clientId/last-weight",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const clientId = c.req.param("clientId");

    try {
      const rows = await db
        .select({ weight_kg: sessionLogs.weight_kg })
        .from(sessionLogs)
        .where(
          and(
            eq(sessionLogs.tenant_id, tenantId),
            eq(sessionLogs.client_id, clientId),
          ),
        )
        .orderBy(desc(sessionLogs.created_at))
        .limit(1);
      return c.json(success({ weight_kg: rows[0]?.weight_kg ?? null }));
    } catch (err) {
      return c.json(success({ weight_kg: null }));
    }
  },
);

// ── GET /coaches/me/clients/:clientId/notes ───────────────────────────────────
app.get(
  "/me/clients/:clientId/notes",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const clientId = c.req.param("clientId");

    try {
      const rows = await db
        .select({
          notes: coachClientNotes.notes,
          updated_at: coachClientNotes.updated_at,
        })
        .from(coachClientNotes)
        .where(
          and(
            eq(coachClientNotes.tenant_id, tenantId),
            eq(coachClientNotes.coach_id, user.id),
            eq(coachClientNotes.client_id, clientId),
          ),
        )
        .limit(1);

      const row = rows[0];
      return c.json(
        success({
          notes: row?.notes ?? "",
          updated_at: row?.updated_at ?? null,
        }),
      );
    } catch (err) {
      return c.json(
        error("CLIENT_NOTES_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── PUT /coaches/me/clients/:clientId/notes ───────────────────────────────────
app.put(
  "/me/clients/:clientId/notes",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator("json", z.object({ notes: z.string() })),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const clientId = c.req.param("clientId");
    const { notes } = c.req.valid("json");

    try {
      // Check if exists
      const existing = await db
        .select({ id: coachClientNotes.id })
        .from(coachClientNotes)
        .where(
          and(
            eq(coachClientNotes.tenant_id, tenantId),
            eq(coachClientNotes.coach_id, user.id),
            eq(coachClientNotes.client_id, clientId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(coachClientNotes)
          .set({ notes, updated_at: new Date() })
          .where(eq(coachClientNotes.id, existing[0].id));
      } else {
        const id = generateId();
        await db.insert(coachClientNotes).values({
          id,
          tenant_id: tenantId,
          coach_id: user.id,
          client_id: clientId,
          notes,
        });
      }

      return c.json(success({ saved: true }));
    } catch (err) {
      return c.json(
        error("CLIENT_NOTES_SAVE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── POST /members/:memberId/assign-coach ─────────────────────────────────────
app.post(
  "/members/:memberId/assign-coach",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator(
    "json",
    z.object({ coachId: z.string().nullable() }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const memberId = c.req.param("memberId");
    const { coachId } = c.req.valid("json");

    try {
      const [membership] = await db
        .select()
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        )
        .limit(1);

      if (!membership) {
        return c.json(
          error("NOT_FOUND", "Member not found in this tenant"),
          404,
        );
      }

      if (coachId) {
        const [coachMembership] = await db
          .select()
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenant_id, tenantId),
              eq(tenantMemberships.user_id, coachId),
              eq(tenantMemberships.status, "active"),
            ),
          )
          .limit(1);

        if (!coachMembership) {
          return c.json(
            error("COACH_NOT_FOUND", "Coach not found in this tenant"),
            404,
          );
        }
      }

      await db
        .update(tenantMemberships)
        .set({ coach_id: coachId })
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.user_id, memberId),
          ),
        );

      return c.json(success({ assigned: true, coachId }));
    } catch (err) {
      return c.json(
        error("ASSIGN_COACH_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /coaches ─────────────────────────────────────────────────────────────
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const tenantId = c.get("tenantId");

    try {
      const coaches = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar_url: users.avatar_url,
          role: tenantMemberships.role,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.status, "active"),
            or(
              eq(tenantMemberships.role, "coach"),
              eq(tenantMemberships.role, "staff"),
              eq(tenantMemberships.role, "admin"),
            ),
          ),
        );

      return c.json(success(coaches));
    } catch (err) {
      return c.json(error("COACHES_ERROR", (err as Error).message), 500);
    }
  },
);

// ── GET /me/availability ──────────────────────────────────────────────────────
app.get(
  "/me/availability",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");

    try {
      const slots = await db
        .select()
        .from(coachAvailability)
        .where(
          and(
            eq(coachAvailability.tenant_id, tenantId),
            eq(coachAvailability.coach_id, user.id),
          ),
        )
        .orderBy(coachAvailability.day_of_week);

      return c.json(success(slots));
    } catch (err) {
      return c.json(
        error("AVAILABILITY_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── POST /me/availability ─────────────────────────────────────────────────────
app.post(
  "/me/availability",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator(
    "json",
    z.object({
      day_of_week: z.number().int().min(0).max(6).optional(),
      start_time: z.string(),
      end_time: z.string(),
      is_recurring: z.boolean().default(true),
      specific_date: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const id = generateId();
      await db.insert(coachAvailability).values({
        id,
        tenant_id: tenantId,
        coach_id: user.id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        is_recurring: body.is_recurring,
        specific_date: body.specific_date,
      });

      return c.json(success({ id }), 201);
    } catch (err) {
      return c.json(
        error("AVAILABILITY_CREATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── DELETE /me/availability/:slotId ──────────────────────────────────────────
app.delete(
  "/me/availability/:slotId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const slotId = c.req.param("slotId");

    try {
      await db
        .delete(coachAvailability)
        .where(
          and(
            eq(coachAvailability.id, slotId),
            eq(coachAvailability.tenant_id, tenantId),
            eq(coachAvailability.coach_id, user.id),
          ),
        );

      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error("AVAILABILITY_DELETE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /me/bookings ──────────────────────────────────────────────────────────
app.get(
  "/me/bookings",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");

    try {
      const bookingRows = await db
        .select({
          booking: coachBookings,
          clientName: users.name,
          clientEmail: users.email,
          clientAvatar: users.avatar_url,
        })
        .from(coachBookings)
        .innerJoin(users, eq(coachBookings.client_id, users.id))
        .where(
          and(
            eq(coachBookings.tenant_id, tenantId),
            eq(coachBookings.coach_id, user.id),
          ),
        )
        .orderBy(coachBookings.booking_date, coachBookings.start_time);

      const result = bookingRows.map((b) => ({
        ...b.booking,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        clientAvatar: b.clientAvatar,
      }));

      return c.json(success(result));
    } catch (err) {
      return c.json(error("BOOKINGS_ERROR", (err as Error).message), 500);
    }
  },
);

// ── POST /me/bookings ─────────────────────────────────────────────────────────
app.post(
  "/me/bookings",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator(
    "json",
    z.object({
      client_id: z.string(),
      booking_date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      status: z.string().default("confirmed"),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const id = generateId();
      await db.insert(coachBookings).values({
        id,
        tenant_id: tenantId,
        coach_id: user.id,
        client_id: body.client_id,
        booking_date: body.booking_date,
        start_time: body.start_time,
        end_time: body.end_time,
        status: body.status,
        notes: body.notes,
      });

      return c.json(success({ id }), 201);
    } catch (err) {
      return c.json(
        error("BOOKING_CREATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── PATCH /me/bookings/:bookingId ─────────────────────────────────────────────
app.patch(
  "/me/bookings/:bookingId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator(
    "json",
    z.object({
      status: z.string().optional(),
      notes: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const bookingId = c.req.param("bookingId");
    const body = c.req.valid("json");

    try {
      await db
        .update(coachBookings)
        .set(body)
        .where(
          and(
            eq(coachBookings.id, bookingId),
            eq(coachBookings.tenant_id, tenantId),
            eq(coachBookings.coach_id, user.id),
          ),
        );

      return c.json(success({ updated: true }));
    } catch (err) {
      return c.json(
        error("BOOKING_UPDATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── GET /training-logs — coach sees logs for their clients ────────────────────
app.get(
  "/training-logs",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const clientId = c.req.query("clientId") || c.req.query("client_id");
    const trainingType = c.req.query("type");
    const dateFrom = c.req.query("date_from");
    const dateTo = c.req.query("date_to");

    try {
      // Build conditions using parameterized Drizzle queries (no SQL injection)
      const conditions = [
        eq(sessionLogs.tenant_id, tenantId),
        eq(sessionLogs.coach_id, user.id),
      ];

      if (clientId) {
        conditions.push(eq(sessionLogs.client_id, clientId));
      }
      if (trainingType) {
        // Use sql template for array containment — parameterized, safe
        conditions.push(sql`${trainingType} = ANY(${sessionLogs.training_types})`);
      }
      if (dateFrom) {
        conditions.push(gte(sessionLogs.created_at, new Date(dateFrom)));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        conditions.push(lte(sessionLogs.created_at, endDate));
      }

      const rows = await db
        .select({
          id: sessionLogs.id,
          client_id: sessionLogs.client_id,
          session_type: sessionLogs.session_type,
          notes: sessionLogs.notes,
          exercises: sessionLogs.exercises,
          metrics: sessionLogs.metrics,
          training_types: sessionLogs.training_types,
          weight_kg: sessionLogs.weight_kg,
          sessions_used: sessionLogs.sessions_used,
          published: sessionLogs.published,
          published_at: sessionLogs.published_at,
          created_at: sessionLogs.created_at,
          updated_at: sessionLogs.updated_at,
          clientName: users.name,
          clientEmail: users.email,
          clientAvatar: users.avatar_url,
        })
        .from(sessionLogs)
        .innerJoin(users, eq(sessionLogs.client_id, users.id))
        .where(and(...conditions))
        .orderBy(desc(sessionLogs.created_at));

      return c.json(success(rows));
    } catch (err) {
      return c.json(
        error("TRAINING_LOGS_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── POST /training-logs ───────────────────────────────────────────────────────
app.post(
  "/training-logs",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator(
    "json",
    z.object({
      client_id: z.string(),
      date: z.string().optional(),
      training_types: z.array(z.string()).default([]),
      weight_kg: z.number().optional(),
      sessions_used: z.number().int().min(1).default(1),
      exercises: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string(),
            training_type: z.string().optional(),
            sets: z.number().int().optional(),
            reps: z.number().int().optional(),
            weight: z.number().optional(),
            notes: z.string().optional(),
          }),
        )
        .default([]),
      notes: z.string().optional(),
      session_type: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const ptPackages = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenant_id, tenantId),
            eq(subscriptions.customer_id, body.client_id),
            eq(subscriptions.package_type, "pt_package"),
            eq(subscriptions.status, "active"),
          ),
        )
        .limit(1);

      const ptPkg = ptPackages[0];
      const sessionsToDeduct = body.sessions_used ?? 1;

      if (ptPkg && (ptPkg.remaining_classes ?? 0) < sessionsToDeduct) {
        return c.json(
          error(
            "NO_CLASSES_REMAINING",
            `Client only has ${ptPkg.remaining_classes} class(es) remaining. Cannot deduct ${sessionsToDeduct}.`,
          ),
          400,
        );
      }

      const id = generateId();
      const now = new Date();
      const sessionDate = body.date ? new Date(body.date) : now;

      const sessionType =
        (body.session_type as any) ?? "personal_training";

      // Build parameterized array for training_types using drizzle sql template
      const trainingTypesArr = body.training_types;
      const trainingTypesSql = trainingTypesArr.length > 0
        ? sql.join(trainingTypesArr.map((t) => sql`${t}`), sql`,`)
        : sql``;
      const trainingTypesExpr = trainingTypesArr.length > 0
        ? sql`ARRAY[${trainingTypesSql}]::text[]`
        : sql`ARRAY[]::text[]`;

      await db.execute(
        sql`INSERT INTO session_logs (
              id, tenant_id, client_id, coach_id, session_type, notes, exercises,
              training_types, weight_kg, sessions_used, published, published_at,
              created_at, updated_at
            ) VALUES (
              ${id}, ${tenantId}, ${body.client_id}, ${user.id}, ${sessionType},
              ${body.notes ?? null},
              ${JSON.stringify(body.exercises)}::jsonb,
              ${trainingTypesExpr},
              ${body.weight_kg ?? null},
              ${sessionsToDeduct},
              true,
              ${sessionDate.toISOString()},
              ${sessionDate.toISOString()},
              ${sessionDate.toISOString()}
            )`,
      );

      let remaining_classes: number | null = null;
      let low_classes_warning = false;

      if (ptPkg) {
        const newRemaining = Math.max(
          0,
          (ptPkg.remaining_classes ?? sessionsToDeduct) - sessionsToDeduct,
        );
        remaining_classes = newRemaining;
        low_classes_warning = newRemaining <= 5;

        await db
          .update(subscriptions)
          .set({
            remaining_classes: newRemaining,
            status: newRemaining === 0 ? "canceled" : "active",
            updated_at: now,
          })
          .where(eq(subscriptions.id, ptPkg.id));
      }

      return c.json(
        success({ id, remaining_classes, low_classes_warning }),
        201,
      );
    } catch (err) {
      return c.json(
        error("TRAINING_LOG_CREATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── Admin only: PATCH /training-logs/:logId ───────────────────────────────────
app.patch(
  "/training-logs/:logId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator(
    "json",
    z.object({
      notes: z.string().optional(),
      exercises: z.array(z.any()).optional(),
      training_types: z.array(z.string()).optional(),
      weight_kg: z.number().optional(),
    }),
  ),
  async (c) => {
    const tenantId = c.get("tenantId");
    const logId = c.req.param("logId");
    const body = c.req.valid("json");

    try {
      const updates: Record<string, unknown> = {};
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.exercises !== undefined) updates.exercises = body.exercises;
      if (body.weight_kg !== undefined) updates.weight_kg = body.weight_kg;

      if (Object.keys(updates).length > 0) {
        await db
          .update(sessionLogs)
          .set({ ...updates, updated_at: new Date() } as any)
          .where(
            and(
              eq(sessionLogs.id, logId),
              eq(sessionLogs.tenant_id, tenantId),
            ),
          );
      }

      // Handle training_types separately (array type)
      if (body.training_types !== undefined) {
        const typesArr = body.training_types;
        await db.execute(
          sql`UPDATE session_logs SET training_types = ${sql`ARRAY[${sql.join(typesArr.map((t) => sql`${t}`), sql`, `)}]::text[]`}, updated_at = NOW() WHERE id = ${logId} AND tenant_id = ${tenantId}`,
        );
      }

      return c.json(success({ updated: true }));
    } catch (err) {
      return c.json(
        error("TRAINING_LOG_UPDATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

// ── Admin only: DELETE /training-logs/:logId ──────────────────────────────────
app.delete(
  "/training-logs/:logId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const logId = c.req.param("logId");

    try {
      await db
        .delete(sessionLogs)
        .where(
          and(
            eq(sessionLogs.id, logId),
            eq(sessionLogs.tenant_id, tenantId),
          ),
        );

      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error("TRAINING_LOG_DELETE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

export { app as coachRouter };
