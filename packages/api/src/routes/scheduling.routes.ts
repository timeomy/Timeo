import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@timeo/db";
import {
  staffAvailability,
  businessHours,
  blockedSlots,
} from "@timeo/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import {
  SetStaffAvailabilitySchema,
  SetBusinessHoursSchema,
  CreateBlockedSlotSchema,
} from "../lib/validation.js";

const app = new Hono();

// ─── Staff Availability ───────────────────────────────────────────────────────

// GET /tenants/:tenantId/scheduling/staff-availability
app.get(
  "/staff-availability",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(staffAvailability)
      .where(eq(staffAvailability.tenant_id, tenantId));
    return c.json(success(rows));
  },
);

// PUT /tenants/:tenantId/scheduling/staff-availability
app.put(
  "/staff-availability",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", SetStaffAvailabilitySchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Upsert: delete existing + insert
    await db
      .delete(staffAvailability)
      .where(
        and(
          eq(staffAvailability.tenant_id, tenantId),
          eq(staffAvailability.staff_id, body.staffId),
          eq(staffAvailability.day_of_week, body.dayOfWeek),
        ),
      );

    const id = generateId();
    await db.insert(staffAvailability).values({
      id,
      tenant_id: tenantId,
      staff_id: body.staffId,
      day_of_week: body.dayOfWeek,
      start_time: body.startTime,
      end_time: body.endTime,
      is_available: body.isAvailable,
    });

    return c.json(success({ id }));
  },
);

// ─── Business Hours ───────────────────────────────────────────────────────────

// GET /tenants/:tenantId/scheduling/business-hours
app.get(
  "/business-hours",
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.tenant_id, tenantId));
    return c.json(success(rows));
  },
);

// PUT /tenants/:tenantId/scheduling/business-hours
app.put(
  "/business-hours",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", SetBusinessHoursSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    await db
      .delete(businessHours)
      .where(
        and(
          eq(businessHours.tenant_id, tenantId),
          eq(businessHours.day_of_week, body.dayOfWeek),
        ),
      );

    const id = generateId();
    await db.insert(businessHours).values({
      id,
      tenant_id: tenantId,
      day_of_week: body.dayOfWeek,
      open_time: body.openTime,
      close_time: body.closeTime,
      is_open: body.isOpen,
    });

    return c.json(success({ id }));
  },
);

// ─── Blocked Slots ────────────────────────────────────────────────────────────

// GET /tenants/:tenantId/scheduling/blocked-slots
app.get(
  "/blocked-slots",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin", "staff"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const rows = await db
      .select()
      .from(blockedSlots)
      .where(eq(blockedSlots.tenant_id, tenantId));
    return c.json(success(rows));
  },
);

// POST /tenants/:tenantId/scheduling/blocked-slots
app.post(
  "/blocked-slots",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", CreateBlockedSlotSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");
    const id = generateId();

    await db.insert(blockedSlots).values({
      id,
      tenant_id: tenantId,
      staff_id: body.staffId ?? null,
      start_time: new Date(body.startTime),
      end_time: new Date(body.endTime),
      reason: body.reason,
      created_by: user.id,
    });

    return c.json(success({ id }), 201);
  },
);

// DELETE /tenants/:tenantId/scheduling/blocked-slots/:slotId
app.delete(
  "/blocked-slots/:slotId",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    await db
      .delete(blockedSlots)
      .where(eq(blockedSlots.id, c.req.param("slotId")));
    return c.json(success({ message: "Blocked slot removed" }));
  },
);

export { app as schedulingRouter };
