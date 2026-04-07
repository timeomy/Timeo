import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, generateId } from "@timeo/db";
import { checkIns, users, memberQrCodes, tenantMemberships } from "@timeo/db/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import { CreateCheckInSchema } from "../lib/validation.js";
import * as CheckInService from "../services/check-in.service.js";

const app = new Hono();

// GET /tenants/:tenantId/check-ins/stats
app.get(
  "/stats",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // Today's check-ins
      const [todayRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, todayStart),
          ),
        );

      // This week's check-ins
      const [weekRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, weekStart),
          ),
        );

      // This month's check-ins
      const [monthRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, monthStart),
          ),
        );

      // Unique users today
      const [uniqueRow] = await db
        .select({ count: sql<number>`count(DISTINCT ${checkIns.user_id})` })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, todayStart),
          ),
        );

      // By method today
      const methodRows = await db
        .select({
          method: checkIns.method,
          count: count(),
        })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            gte(checkIns.timestamp, todayStart),
          ),
        )
        .groupBy(checkIns.method);

      const byMethod: Record<string, number> = { qr: 0, nfc: 0, manual: 0 };
      for (const row of methodRows) {
        byMethod[row.method] = Number(row.count);
      }

      return c.json(
        success({
          today: Number(todayRow?.count ?? 0),
          thisWeek: Number(weekRow?.count ?? 0),
          monthCount: Number(monthRow?.count ?? 0),
          uniqueToday: Number(uniqueRow?.count ?? 0),
          byMethod,
        }),
      );
    } catch (err) {
      return c.json(error("CHECKIN_STATS_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /tenants/:tenantId/check-ins
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select({
        checkIn: checkIns,
        user: { name: users.name, email: users.email },
      })
      .from(checkIns)
      .leftJoin(users, eq(checkIns.user_id, users.id))
      .where(eq(checkIns.tenant_id, tenantId))
      .orderBy(desc(checkIns.timestamp));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/check-ins
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  zValidator("json", CreateCheckInSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    try {
      const checkInId = await CheckInService.createCheckIn({
        tenantId,
        userId: body.userId,
        method: body.method,
        checkedInBy: user.id,
      });
      return c.json(success({ checkInId }), 201);
    } catch (err) {
      return c.json(error("CHECKIN_ERROR", (err as Error).message), 422);
    }
  },
);


// GET /tenants/:tenantId/check-ins/my-history - customer check-in history
app.get(
  "/my-history",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    try {
      const [totalRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
          ),
        );
      const total = Number(totalRow?.count ?? 0);

      const rows = await db
        .select({
          id: checkIns.id,
          method: checkIns.method,
          checkedInAt: checkIns.timestamp,
        })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
          ),
        )
        .orderBy(desc(checkIns.timestamp))
        .limit(limit)
        .offset(offset);

      return c.json(
        success({
          items: rows.map((r) => ({
            id: r.id,
            method: r.method,
            checkedInAt: r.checkedInAt?.toISOString() ?? new Date().toISOString(),
          })),
          total,
          page,
          limit,
        }),
      );
    } catch (err) {
      return c.json(error("CHECKIN_HISTORY_ERROR", (err as Error).message), 500);
    }
  },
);


// GET /tenants/:tenantId/check-ins/stats/me - member's own check-in stats
app.get(
  "/stats/me",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");

    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const [monthRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
            gte(checkIns.timestamp, monthStart),
          ),
        );

      const [weekRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
            gte(checkIns.timestamp, weekStart),
          ),
        );

      const [lastRow] = await db
        .select({ lastVisit: sql`MAX(${checkIns.timestamp})` })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
          ),
        );

      const [totalRow] = await db
        .select({ count: count() })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.tenant_id, tenantId),
            eq(checkIns.user_id, user.id),
          ),
        );

      const lastVisitRaw = lastRow?.lastVisit as Date | string | null | undefined;
      const lastVisit = lastVisitRaw ? new Date(lastVisitRaw).toISOString() : null;

      return c.json(
        success({
          thisMonth: Number(monthRow?.count ?? 0),
          thisWeek: Number(weekRow?.count ?? 0),
          lastVisit,
          totalVisits: Number(totalRow?.count ?? 0),
        }),
      );
    } catch (err) {
      return c.json(error("CHECKIN_STATS_ME_ERROR", (err as Error).message), 500);
    }
  },
);

import { buildPermanentQr } from "./gate.routes.js";

// ─── GET /check-ins/qr-code ─────────────────────────────────────────────────
// Returns the member's permanent QR code. Creates it on first call.
app.get("/qr-code", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");

  try {
    // Look up member_id
    const [membership] = await db
      .select({ memberId: tenantMemberships.member_id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenant_id, tenantId),
          eq(tenantMemberships.user_id, user.id),
        ),
      )
      .limit(1);

    if (!membership?.memberId) {
      return c.json(error("NOT_MEMBER", "No membership found for this tenant"), 404);
    }

    const memberId = membership.memberId;
    const qrCode = buildPermanentQr(memberId, tenantId);

    // Upsert into member_qr_codes (idempotent — same code every time)
    const existing = await db
      .select({ id: memberQrCodes.id, code: memberQrCodes.code })
      .from(memberQrCodes)
      .where(
        and(
          eq(memberQrCodes.tenant_id, tenantId),
          eq(memberQrCodes.user_id, user.id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(memberQrCodes).values({
        id: generateId(),
        tenant_id: tenantId,
        user_id: user.id,
        code: qrCode,
        is_active: true,
        expires_at: null, // permanent — no expiry
      });
    } else if (existing[0].code !== qrCode) {
      // Code mismatch (e.g. secret rotated) — update it
      await db
        .update(memberQrCodes)
        .set({ code: qrCode, is_active: true, expires_at: null })
        .where(eq(memberQrCodes.id, existing[0].id));
    }

    return c.json(
      success({
        id: existing[0]?.id ?? "new",
        tenantId,
        userId: user.id,
        memberId,
        code: qrCode,
        isActive: true,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    return c.json(error("QR_ERROR", (err as Error).message), 500);
  }
});

// ─── POST /check-ins/qr-code ─────────────────────────────────────────────────
// Same as GET — permanent code doesn't change, but kept for compat with
// existing useGenerateQrCode hook.
app.post("/qr-code", authMiddleware, tenantMiddleware, async (c) => {
  // Delegate to GET handler logic (reuse by redirecting internally)
  return c.redirect(`/api/tenants/${c.get("tenantId")}/check-ins/qr-code`, 307);
});


export { app as checkInsRouter };
