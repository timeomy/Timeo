import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import {
  paymentRequests,
  memberships,
  sessionPackages,
  subscriptions,
  sessionCredits,
  memberQrCodes,
} from "@timeo/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@timeo/db";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const CreatePaymentRequestSchema = z.object({
  planId: z.string().min(1),
  planReferenceType: z.enum(["membership", "session_package"]).default("membership"),
  memberNote: z.string().max(500).optional(),
  receiptUrl: z.string().url().optional(),
});

const UploadReceiptSchema = z.object({
  receiptUrl: z.string().url(),
});

const ApproveRequestSchema = z.object({
  adminNote: z.string().max(500).optional(),
});

const RejectRequestSchema = z.object({
  adminNote: z.string().min(1).max(500),
});

// ─── GET /tenants/:tenantId/payment-requests — admin: list all ──────────────
app.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const status = c.req.query("status");

    const query = db
      .select({
        id: paymentRequests.id,
        customerId: paymentRequests.customer_id,
        planId: paymentRequests.plan_id,
        planReferenceType: paymentRequests.plan_reference_type,
        planName: paymentRequests.plan_name,
        planDurationMonths: paymentRequests.plan_duration_months,
        planSessionCount: paymentRequests.plan_session_count,
        amount: paymentRequests.amount,
        currency: paymentRequests.currency,
        receiptUrl: paymentRequests.receipt_url,
        status: paymentRequests.status,
        memberNote: paymentRequests.member_note,
        adminNote: paymentRequests.admin_note,
        approvedBy: paymentRequests.approved_by,
        approvedAt: paymentRequests.approved_at,
        rejectedAt: paymentRequests.rejected_at,
        subscriptionId: paymentRequests.subscription_id,
        sessionCreditId: paymentRequests.session_credit_id,
        createdAt: paymentRequests.created_at,
        updatedAt: paymentRequests.updated_at,
      })
      .from(paymentRequests)
      .where(
        status
          ? and(
              eq(paymentRequests.tenant_id, tenantId),
              eq(
                paymentRequests.status,
                status as "pending_verification" | "approved" | "rejected",
              ),
            )
          : eq(paymentRequests.tenant_id, tenantId),
      )
      .orderBy(desc(paymentRequests.created_at));

    const rows = await query;
    return c.json(success(rows));
  },
);

// ─── GET /tenants/:tenantId/payment-requests/mine — member's own requests ───
app.get("/mine", authMiddleware, tenantMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.get("tenantId");

  const rows = await db
    .select()
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.tenant_id, tenantId),
        eq(paymentRequests.customer_id, user.id),
      ),
    )
    .orderBy(desc(paymentRequests.created_at));

  return c.json(success(rows));
});

// ─── POST /tenants/:tenantId/payment-requests — member creates request ───────
app.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", CreatePaymentRequestSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const body = c.req.valid("json");

    // Look up plan details
    let planName = "";
    let planDurationMonths: number | null = null;
    let planSessionCount: number | null = null;
    let planPrice = 0;

    if (body.planReferenceType === "membership") {
      const [plan] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.id, body.planId),
            eq(memberships.tenant_id, tenantId),
          ),
        )
        .limit(1);

      if (!plan) {
        return c.json(error("NOT_FOUND", "Membership plan not found"), 404);
      }
      if (!plan.is_active) {
        return c.json(error("INACTIVE", "Plan is not currently available"), 422);
      }
      planName = plan.name;
      planDurationMonths = plan.duration_months ?? (plan.interval === "yearly" ? 12 : 1);
      planPrice = plan.price;
    } else {
      const [pkg] = await db
        .select()
        .from(sessionPackages)
        .where(
          and(
            eq(sessionPackages.id, body.planId),
            eq(sessionPackages.tenant_id, tenantId),
          ),
        )
        .limit(1);

      if (!pkg) {
        return c.json(error("NOT_FOUND", "Session package not found"), 404);
      }
      if (!pkg.is_active) {
        return c.json(error("INACTIVE", "Package is not currently available"), 422);
      }
      planName = pkg.name;
      planSessionCount = pkg.session_count;
      planPrice = pkg.price;
    }

    const id = generateId();
    await db.insert(paymentRequests).values({
      id,
      tenant_id: tenantId,
      customer_id: user.id,
      plan_id: body.planId,
      plan_reference_type: body.planReferenceType,
      plan_name: planName,
      plan_duration_months: planDurationMonths,
      plan_session_count: planSessionCount,
      amount: planPrice,
      currency: "MYR",
      receipt_url: body.receiptUrl ?? null,
      status: "pending_verification",
      member_note: body.memberNote ?? null,
    });

    return c.json(success({ id, amount: planPrice, planName }), 201);
  },
);

// ─── PATCH /tenants/:tenantId/payment-requests/:id/receipt — upload receipt ─
app.patch(
  "/:id/receipt",
  authMiddleware,
  tenantMiddleware,
  zValidator("json", UploadReceiptSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const requestId = c.req.param("id");
    const body = c.req.valid("json");

    const [req] = await db
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.id, requestId),
          eq(paymentRequests.tenant_id, tenantId),
          eq(paymentRequests.customer_id, user.id),
        ),
      )
      .limit(1);

    if (!req) {
      return c.json(error("NOT_FOUND", "Payment request not found"), 404);
    }
    if (req.status !== "pending_verification") {
      return c.json(
        error("INVALID_STATE", "Can only update receipt on pending requests"),
        422,
      );
    }

    await db
      .update(paymentRequests)
      .set({ receipt_url: body.receiptUrl, updated_at: new Date() })
      .where(eq(paymentRequests.id, requestId));

    return c.json(success({ receiptUrl: body.receiptUrl }));
  },
);

// ─── POST /tenants/:tenantId/payment-requests/:id/approve — admin approves ──
app.post(
  "/:id/approve",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", ApproveRequestSchema),
  async (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    const requestId = c.req.param("id");
    const body = c.req.valid("json");

    const [req] = await db
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.id, requestId),
          eq(paymentRequests.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!req) {
      return c.json(error("NOT_FOUND", "Payment request not found"), 404);
    }
    if (req.status !== "pending_verification") {
      return c.json(
        error("INVALID_STATE", "Request is not pending verification"),
        422,
      );
    }

    const now = new Date();
    let subscriptionId: string | null = null;
    let sessionCreditId: string | null = null;

    if (req.plan_reference_type === "membership") {
      // Create subscription
      const durationMonths = req.plan_duration_months ?? 1;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

      subscriptionId = generateId();
      await db.insert(subscriptions).values({
        id: subscriptionId,
        tenant_id: tenantId,
        customer_id: req.customer_id,
        membership_id: req.plan_id!,
        status: "active",
        current_period_start: now,
        current_period_end: periodEnd,
      });

      // Ensure member has an active QR code
      const existingQr = await db
        .select()
        .from(memberQrCodes)
        .where(
          and(
            eq(memberQrCodes.tenant_id, tenantId),
            eq(memberQrCodes.user_id, req.customer_id),
            eq(memberQrCodes.is_active, true),
          ),
        )
        .limit(1);

      if (existingQr.length === 0) {
        // Generate a QR code for this member
        const { default: crypto } = await import("node:crypto");
        const code = `TIMEO:${tenantId}:${req.customer_id}:${crypto.randomBytes(6).toString("hex")}`;
        await db.insert(memberQrCodes).values({
          id: generateId(),
          tenant_id: tenantId,
          user_id: req.customer_id,
          code,
          is_active: true,
          expires_at: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
        });
      } else {
        // Update expiry of existing QR
        const durationMonths2 = req.plan_duration_months ?? 1;
        await db
          .update(memberQrCodes)
          .set({
            is_active: true,
            expires_at: new Date(Date.now() + durationMonths2 * 30 * 24 * 60 * 60 * 1000),
          })
          .where(eq(memberQrCodes.id, existingQr[0].id));
      }
    } else {
      // Create session credits
      const sessionCount = req.plan_session_count ?? 1;

      sessionCreditId = generateId();
      await db.insert(sessionCredits).values({
        id: sessionCreditId,
        tenant_id: tenantId,
        user_id: req.customer_id,
        package_id: req.plan_id!,
        total_sessions: sessionCount,
        used_sessions: 0,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for session credits
        purchased_at: now,
      });
    }

    // Update payment request to approved
    await db
      .update(paymentRequests)
      .set({
        status: "approved",
        approved_by: user.id,
        approved_at: now,
        admin_note: body.adminNote ?? null,
        subscription_id: subscriptionId,
        session_credit_id: sessionCreditId,
        updated_at: now,
      })
      .where(eq(paymentRequests.id, requestId));

    return c.json(
      success({
        message: "Payment approved. Membership activated.",
        subscriptionId,
        sessionCreditId,
      }),
    );
  },
);

// ─── POST /tenants/:tenantId/payment-requests/:id/reject — admin rejects ─────
app.post(
  "/:id/reject",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  zValidator("json", RejectRequestSchema),
  async (c) => {
    const tenantId = c.get("tenantId");
    const requestId = c.req.param("id");
    const body = c.req.valid("json");

    const [req] = await db
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.id, requestId),
          eq(paymentRequests.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!req) {
      return c.json(error("NOT_FOUND", "Payment request not found"), 404);
    }
    if (req.status !== "pending_verification") {
      return c.json(
        error("INVALID_STATE", "Request is not pending verification"),
        422,
      );
    }

    await db
      .update(paymentRequests)
      .set({
        status: "rejected",
        admin_note: body.adminNote,
        rejected_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentRequests.id, requestId));

    return c.json(success({ message: "Payment request rejected." }));
  },
);

export { app as paymentRequestsRouter };
