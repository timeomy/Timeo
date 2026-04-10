import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  coachBookings,
  memberships,
  sessionLogs,
  subscriptions,
  tenantMemberships,
  users,
} from "@timeo/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireCapability } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

type ClassScheduleRow = {
  classId: string;
  className: string | null;
  location: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  enrollmentStatus: string | null;
  attendedAt: Date | string | null;
};

type ClassAttendanceRow = {
  enrollmentId: string;
  classId: string;
  className: string | null;
  location: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  memberId: string;
  memberName: string | null;
  memberEmail: string | null;
  memberAvatar: string | null;
  status: string | null;
  attendedAt: Date | string | null;
};

const AttendanceUpdateSchema = z.object({
  attended: z.boolean(),
});

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const dateValue = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(dateValue.getTime())) return null;
  return dateValue.toISOString();
}

function toBookingIso(bookingDate?: string | null, bookingTime?: string | null): string | null {
  if (!bookingDate || !bookingTime) return null;
  const composed = `${bookingDate}T${bookingTime}`;
  const parsed = new Date(composed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function fetchClassScheduleRows(
  tenantId: string,
  coachId: string,
): Promise<ClassScheduleRow[]> {
  const primaryQuery = sql`
    SELECT
      ce.class_id AS "classId",
      gc.name AS "className",
      gc.location AS "location",
      gc.start_time AS "startAt",
      gc.end_time AS "endAt",
      ce.status AS "enrollmentStatus",
      ce.attended_at AS "attendedAt"
    FROM class_enrollments ce
    INNER JOIN group_classes gc ON gc.id = ce.class_id
    WHERE ce.tenant_id = ${tenantId}
      AND gc.coach_id = ${coachId}
      AND (gc.start_time IS NULL OR gc.start_time >= NOW() - INTERVAL '1 day')
    ORDER BY gc.start_time ASC
  `;

  const fallbackQuery = sql`
    SELECT
      ce.class_id AS "classId",
      gc.name AS "className",
      gc.location AS "location",
      gc.start_time AS "startAt",
      gc.end_time AS "endAt",
      ce.status AS "enrollmentStatus",
      ce.attended_at AS "attendedAt"
    FROM class_enrollments ce
    INNER JOIN group_classes gc ON gc.id = ce.class_id
    WHERE ce.tenant_id = ${tenantId}
      AND gc.instructor_id = ${coachId}
      AND (gc.start_time IS NULL OR gc.start_time >= NOW() - INTERVAL '1 day')
    ORDER BY gc.start_time ASC
  `;

  try {
    const rows = await db.execute(primaryQuery);
    const mapped = rows as unknown as ClassScheduleRow[];
    if (mapped.length > 0) {
      return mapped;
    }

    try {
      const fallbackRows = await db.execute(fallbackQuery);
      return fallbackRows as unknown as ClassScheduleRow[];
    } catch (fallbackErr) {
      const fallbackCode = (fallbackErr as { code?: string }).code;
      if (fallbackCode === "42P01" || fallbackCode === "42703") {
        return [];
      }
      throw fallbackErr;
    }
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code === "42703") {
      try {
        const rows = await db.execute(fallbackQuery);
        return rows as unknown as ClassScheduleRow[];
      } catch (fallbackErr) {
        const fallbackCode = (fallbackErr as { code?: string }).code;
        if (fallbackCode === "42P01" || fallbackCode === "42703") {
          return [];
        }
        throw fallbackErr;
      }
    }

    if (code === "42P01") {
      return [];
    }

    throw err;
  }
}

async function fetchClassAttendanceRows(
  tenantId: string,
  classId: string,
  coachId?: string,
): Promise<ClassAttendanceRow[]> {
  const buildQuery = (coachColumn?: "coach_id" | "instructor_id") => {
    if (!coachId || !coachColumn) {
      return sql`
        SELECT
          ce.id AS "enrollmentId",
          ce.class_id AS "classId",
          gc.name AS "className",
          gc.location AS "location",
          gc.start_time AS "startAt",
          gc.end_time AS "endAt",
          ce.user_id AS "memberId",
          u.name AS "memberName",
          u.email AS "memberEmail",
          u.avatar_url AS "memberAvatar",
          ce.status AS "status",
          ce.attended_at AS "attendedAt"
        FROM class_enrollments ce
        INNER JOIN group_classes gc ON gc.id = ce.class_id
        LEFT JOIN users u ON u.id = ce.user_id
        WHERE ce.tenant_id = ${tenantId}
          AND ce.class_id = ${classId}
        ORDER BY u.name ASC NULLS LAST
      `;
    }

    const coachFilter =
      coachColumn === "coach_id"
        ? sql`gc.coach_id = ${coachId}`
        : sql`gc.instructor_id = ${coachId}`;

    return sql`
      SELECT
        ce.id AS "enrollmentId",
        ce.class_id AS "classId",
        gc.name AS "className",
        gc.location AS "location",
        gc.start_time AS "startAt",
        gc.end_time AS "endAt",
        ce.user_id AS "memberId",
        u.name AS "memberName",
        u.email AS "memberEmail",
        u.avatar_url AS "memberAvatar",
        ce.status AS "status",
        ce.attended_at AS "attendedAt"
      FROM class_enrollments ce
      INNER JOIN group_classes gc ON gc.id = ce.class_id
      LEFT JOIN users u ON u.id = ce.user_id
      WHERE ce.tenant_id = ${tenantId}
        AND ce.class_id = ${classId}
        AND ${coachFilter}
      ORDER BY u.name ASC NULLS LAST
    `;
  };

  const candidates = coachId
    ? [buildQuery("coach_id"), buildQuery("instructor_id")]
    : [buildQuery(undefined)];

  for (const query of candidates) {
    try {
      const rows = await db.execute(query);
      const mapped = rows as unknown as ClassAttendanceRow[];
      if (mapped.length > 0) {
        return mapped;
      }

      continue;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "42P01" || code === "42703") {
        continue;
      }
      throw err;
    }
  }

  return [];
}

// GET /coach/clients — members assigned to this coach
app.get(
  "/clients",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const coachIdQuery = c.req.query("coachId");

    const effectiveCoachId =
      tenantRole === "coach" ? user.id : (coachIdQuery ?? user.id);

    try {
      const assignments = await db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatar_url,
          membershipStatus: tenantMemberships.status,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(tenantMemberships.user_id, users.id))
        .where(
          and(
            eq(tenantMemberships.tenant_id, tenantId),
            eq(tenantMemberships.coach_id, effectiveCoachId),
            eq(tenantMemberships.role, "customer"),
            eq(tenantMemberships.status, "active"),
          ),
        )
        .orderBy(users.name);

      const clients = await Promise.all(
        assignments.map(async (assignment) => {
          const [activeSubscription] = await db
            .select({
              id: subscriptions.id,
              status: subscriptions.status,
              totalClasses: subscriptions.total_classes,
              remainingClasses: subscriptions.remaining_classes,
              packagePreset: subscriptions.package_preset,
              packageName: memberships.name,
              periodEnd: subscriptions.current_period_end,
            })
            .from(subscriptions)
            .leftJoin(memberships, eq(subscriptions.membership_id, memberships.id))
            .where(
              and(
                eq(subscriptions.tenant_id, tenantId),
                eq(subscriptions.customer_id, assignment.userId),
                eq(subscriptions.package_type, "pt_package"),
                eq(subscriptions.status, "active"),
              ),
            )
            .orderBy(desc(subscriptions.created_at))
            .limit(1);

          const [lastSession] = await db
            .select({ createdAt: sessionLogs.created_at })
            .from(sessionLogs)
            .where(
              and(
                eq(sessionLogs.tenant_id, tenantId),
                eq(sessionLogs.client_id, assignment.userId),
                eq(sessionLogs.coach_id, effectiveCoachId),
              ),
            )
            .orderBy(desc(sessionLogs.created_at))
            .limit(1);

          return {
            id: assignment.userId,
            name: assignment.name,
            email: assignment.email,
            avatarUrl: assignment.avatarUrl,
            planStatus: activeSubscription?.status ?? assignment.membershipStatus,
            planName: activeSubscription?.packageName ?? null,
            totalClasses: activeSubscription?.totalClasses ?? null,
            remainingClasses: activeSubscription?.remainingClasses ?? null,
            packagePreset: activeSubscription?.packagePreset ?? null,
            subscriptionPeriodEnd:
              activeSubscription?.periodEnd?.toISOString() ?? null,
            lastSessionDate: lastSession?.createdAt?.toISOString() ?? null,
          };
        }),
      );

      return c.json(success(clients));
    } catch (err) {
      return c.json(error("COACH_CLIENTS_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /coach/schedule — coach upcoming bookings/classes
app.get(
  "/schedule",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const coachIdQuery = c.req.query("coachId");

    const effectiveCoachId =
      tenantRole === "coach" ? user.id : (coachIdQuery ?? user.id);

    try {
      const bookingRows = await db
        .select({
          id: coachBookings.id,
          bookingDate: coachBookings.booking_date,
          startTime: coachBookings.start_time,
          endTime: coachBookings.end_time,
          status: coachBookings.status,
          notes: coachBookings.notes,
          clientId: users.id,
          clientName: users.name,
          clientEmail: users.email,
          clientAvatar: users.avatar_url,
        })
        .from(coachBookings)
        .leftJoin(users, eq(coachBookings.client_id, users.id))
        .where(
          and(
            eq(coachBookings.tenant_id, tenantId),
            eq(coachBookings.coach_id, effectiveCoachId),
          ),
        )
        .orderBy(coachBookings.booking_date, coachBookings.start_time);

      const classRows = await fetchClassScheduleRows(tenantId, effectiveCoachId);

      const bookingItems = bookingRows
        .map((row) => {
          const startAt = toBookingIso(row.bookingDate, row.startTime);
          const endAt = toBookingIso(row.bookingDate, row.endTime);
          return {
            id: row.id,
            source: "coach_booking" as const,
            title: "Coaching Session",
            startAt,
            endAt,
            status: row.status,
            notes: row.notes,
            clientId: row.clientId,
            clientName: row.clientName,
            clientEmail: row.clientEmail,
            clientAvatar: row.clientAvatar,
          };
        })
        .filter((item) => item.startAt);

      const classMap = new Map<
        string,
        {
          id: string;
          source: "group_class";
          classId: string;
          title: string;
          location: string | null;
          startAt: string | null;
          endAt: string | null;
          enrolledCount: number;
          attendedCount: number;
          status: string;
        }
      >();

      for (const row of classRows) {
        const classId = String(row.classId ?? "").trim();
        if (!classId) continue;

        const current = classMap.get(classId);
        if (!current) {
          classMap.set(classId, {
            id: `class-${classId}`,
            source: "group_class",
            classId,
            title: row.className ?? "Group Class",
            location: row.location,
            startAt: toIso(row.startAt),
            endAt: toIso(row.endAt),
            enrolledCount: 0,
            attendedCount: 0,
            status: "scheduled",
          });
        }

        const entry = classMap.get(classId)!;
        entry.enrolledCount += 1;

        if (row.enrollmentStatus === "attended" || row.attendedAt) {
          entry.attendedCount += 1;
        }
      }

      const scheduleItems = [...bookingItems, ...classMap.values()]
        .filter((item) => item.startAt)
        .sort((a, b) => {
          const aTs = new Date(a.startAt ?? 0).getTime();
          const bTs = new Date(b.startAt ?? 0).getTime();
          return aTs - bTs;
        });

      return c.json(success(scheduleItems));
    } catch (err) {
      return c.json(error("COACH_SCHEDULE_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /coach/attendance/classes/:classId — class roster with attendance
app.get(
  "/attendance/classes/:classId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const classId = c.req.param("classId");

    try {
      const rows = await fetchClassAttendanceRows(
        tenantId,
        classId,
        tenantRole === "coach" ? user.id : undefined,
      );

      if (rows.length === 0) {
        return c.json(
          success({
            class: null,
            enrollments: [],
          }),
        );
      }

      const first = rows[0];
      const classMeta = {
        classId,
        className: first.className ?? "Group Class",
        location: first.location,
        startAt: toIso(first.startAt),
        endAt: toIso(first.endAt),
      };

      const enrollments = rows.map((row) => ({
        enrollmentId: row.enrollmentId,
        memberId: row.memberId,
        memberName: row.memberName ?? "Member",
        memberEmail: row.memberEmail,
        memberAvatar: row.memberAvatar,
        status: row.status ?? "enrolled",
        attended: row.status === "attended" || !!row.attendedAt,
        attendedAt: toIso(row.attendedAt),
      }));

      return c.json(success({ class: classMeta, enrollments }));
    } catch (err) {
      return c.json(error("CLASS_ATTENDANCE_ERROR", (err as Error).message), 500);
    }
  },
);

// PATCH /coach/attendance/classes/:classId/enrollments/:enrollmentId
app.patch(
  "/attendance/classes/:classId/enrollments/:enrollmentId",
  authMiddleware,
  tenantMiddleware,
  requireCapability("coach_session_log"),
  zValidator("json", AttendanceUpdateSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const tenantRole = c.get("tenantRole") as string | undefined;
    const classId = c.req.param("classId");
    const enrollmentId = c.req.param("enrollmentId");
    const body = c.req.valid("json");

    try {
      if (tenantRole === "coach") {
        const roster = await fetchClassAttendanceRows(tenantId, classId, user.id);
        const hasAccess = roster.some(
          (item) => item.enrollmentId === enrollmentId,
        );

        if (!hasAccess) {
          return c.json(
            error("FORBIDDEN", "You cannot update attendance for this class"),
            403,
          );
        }
      }

      const updatedStatus = body.attended ? "attended" : "enrolled";
      const attendedAt = body.attended ? new Date() : null;

      await db.execute(sql`
        UPDATE class_enrollments
        SET status = ${updatedStatus},
            attended_at = ${attendedAt}
        WHERE id = ${enrollmentId}
          AND class_id = ${classId}
          AND tenant_id = ${tenantId}
      `);

      return c.json(
        success({
          enrollmentId,
          attended: body.attended,
          status: updatedStatus,
          attendedAt: attendedAt?.toISOString() ?? null,
        }),
      );
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "42P01" || code === "42703") {
        return c.json(
          error(
            "ATTENDANCE_UNAVAILABLE",
            "Class attendance is not enabled for this tenant",
          ),
          404,
        );
      }

      return c.json(
        error("ATTENDANCE_UPDATE_ERROR", (err as Error).message),
        500,
      );
    }
  },
);

export { app as coachWorkflowRouter };
