import { Hono } from "hono";
import { db } from "@timeo/db";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { requirePlatformAdmin } from "../../middleware/rbac.js";
import { success } from "../../lib/response.js";
import { redis } from "../../lib/redis.js";

const app = new Hono();

// GET /health — Redis ping, DB pool stats, process uptime, memory
app.get("/", authMiddleware, requirePlatformAdmin, async (c) => {
  const checks: Record<string, unknown> = {};

  // PostgreSQL
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "healthy", latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "unknown",
    };
  }

  // Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: "healthy", latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "unknown",
    };
  }

  // Process
  const mem = process.memoryUsage();
  checks.process = {
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    node_version: process.version,
  };

  const allHealthy =
    (checks.database as Record<string, unknown>)?.status === "healthy" &&
    (checks.redis as Record<string, unknown>)?.status === "healthy";

  return c.json(success({ status: allHealthy ? "healthy" : "degraded", checks }));
});

export { app as healthRouter };
