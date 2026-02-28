import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { requireRole } from "../middleware/rbac.js";
import { success, error } from "../lib/response.js";
import * as AnalyticsService from "../services/analytics.service.js";

const app = new Hono();

function parseDateRange(c: { req: { query: (key: string) => string | undefined } }) {
  const from = c.req.query("from");
  const to = c.req.query("to");

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  return { from: fromDate, to: toDate };
}

// GET /tenants/:tenantId/analytics/revenue
app.get(
  "/revenue",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    try {
      const data = await AnalyticsService.getRevenueOverview(tenantId, from, to);
      return c.json(success(data));
    } catch (err) {
      return c.json(error("ANALYTICS_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /tenants/:tenantId/analytics/bookings
app.get(
  "/bookings",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    try {
      const data = await AnalyticsService.getBookingAnalytics(tenantId, from, to);
      return c.json(success(data));
    } catch (err) {
      return c.json(error("ANALYTICS_ERROR", (err as Error).message), 500);
    }
  },
);

// GET /tenants/:tenantId/analytics/top-services
app.get(
  "/top-services",
  authMiddleware,
  tenantMiddleware,
  requireRole("admin"),
  async (c) => {
    const tenantId = c.get("tenantId");
    const { from, to } = parseDateRange(c);

    try {
      const data = await AnalyticsService.getTopServices(tenantId, from, to);
      return c.json(success(data));
    } catch (err) {
      return c.json(error("ANALYTICS_ERROR", (err as Error).message), 500);
    }
  },
);

export { app as analyticsRouter };
