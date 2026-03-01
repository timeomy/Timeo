import { Hono } from "hono";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { servicesRouter } from "./routes/services.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { tenantsRouter } from "./routes/tenants.routes.js";
import { posRouter } from "./routes/pos.routes.js";
import { checkInsRouter } from "./routes/check-ins.routes.js";
import { sessionsRouter } from "./routes/sessions.routes.js";
import { membershipsRouter } from "./routes/memberships.routes.js";
import { vouchersRouter } from "./routes/vouchers.routes.js";
import { giftCardsRouter } from "./routes/gift-cards.routes.js";
import { schedulingRouter } from "./routes/scheduling.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { platformRouter } from "./routes/platform.routes.js";
import { filesRouter } from "./routes/files.routes.js";
import { einvoiceRouter } from "./routes/einvoice.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { stripeWebhookRouter } from "./routes/webhooks/stripe.js";
import { revenueMonsterWebhookRouter } from "./routes/webhooks/revenue-monster.js";
import { doorWebhookRouter } from "./routes/webhooks/door.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use("*", corsMiddleware);
  app.use("*", logger());
  app.use("/api/*", rateLimit({ windowMs: 60_000, max: 200 }));
  app.onError(errorHandler);

  // Health check
  app.route("/health", healthRouter);

  // Better Auth routes
  app.route("/api/auth", authRouter);

  // Tenant-scoped routes
  app.route("/api/tenants", tenantsRouter);
  app.route("/api/tenants/:tenantId/bookings", bookingsRouter);
  app.route("/api/tenants/:tenantId/services", servicesRouter);
  app.route("/api/tenants/:tenantId/products", productsRouter);
  app.route("/api/tenants/:tenantId/orders", ordersRouter);
  app.route("/api/tenants/:tenantId/payments", paymentsRouter);
  app.route("/api/tenants/:tenantId/pos", posRouter);
  app.route("/api/tenants/:tenantId/check-ins", checkInsRouter);
  app.route("/api/tenants/:tenantId/sessions", sessionsRouter);
  app.route("/api/tenants/:tenantId/memberships", membershipsRouter);
  app.route("/api/tenants/:tenantId/vouchers", vouchersRouter);
  app.route("/api/tenants/:tenantId/gift-cards", giftCardsRouter);
  app.route("/api/tenants/:tenantId/scheduling", schedulingRouter);
  app.route("/api/tenants/:tenantId/notifications", notificationsRouter);
  app.route("/api/tenants/:tenantId/analytics", analyticsRouter);
  app.route("/api/tenants/:tenantId/files", filesRouter);
  app.route("/api/tenants/:tenantId/einvoice", einvoiceRouter);

  // Platform admin routes
  app.route("/api/platform", platformRouter);

  // Webhooks (no auth middleware - verified via signatures)
  app.route("/webhooks/stripe", stripeWebhookRouter);
  app.route("/webhooks/revenue-monster", revenueMonsterWebhookRouter);
  app.route("/webhooks/door", doorWebhookRouter);

  return app;
}
