import { Hono } from "hono";
import { tenantsRouter } from "./platform/tenants.js";
import { usersRouter } from "./platform/users.js";
import { plansRouter } from "./platform/plans.js";
import { featureFlagsRouter } from "./platform/feature-flags.js";
import { configRouter } from "./platform/config.js";
import { auditLogRouter } from "./platform/audit-log.js";
import { announcementsRouter } from "./platform/announcements.js";
import { emailTemplatesRouter } from "./platform/email-templates.js";
import { apiKeysRouter } from "./platform/api-keys.js";
import { healthRouter } from "./platform/health.js";
import { analyticsRouter } from "./platform/analytics.js";
import { dataRouter } from "./platform/data.js";

const app = new Hono();

// Module 1 — Tenants
app.route("/tenants", tenantsRouter);

// Module 2 — Users
app.route("/users", usersRouter);

// Module 3 — Billing / Plans
app.route("/plans", plansRouter);

// Module 4 — Feature Flags
app.route("/feature-flags", featureFlagsRouter);

// Module 5 — Platform Config
app.route("/config", configRouter);

// Module 6 — Audit Log
app.route("/audit-log", auditLogRouter);

// Module 7 — Announcements
app.route("/announcements", announcementsRouter);

// Module 8 — Email Templates
app.route("/email-templates", emailTemplatesRouter);

// Module 9 — API Keys
app.route("/api-keys", apiKeysRouter);

// Module 10 — Health
app.route("/health", healthRouter);

// Module 11 — Analytics
app.route("/analytics", analyticsRouter);

// Module 12 — Data
app.route("/data", dataRouter);

export { app as platformRouter };
