import { Hono } from "hono";
import { db } from "@timeo/db";
import { sql } from "drizzle-orm";
import { success } from "../lib/response.js";
import { redis } from "../lib/redis.js";

const app = new Hono();

app.get("/", async (c) => {
  let database: "connected" | "error" = "connected";
  let redisStatus: "connected" | "error" = "connected";

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    database = "error";
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = "error";
  }

  const allOk = database === "connected" && redisStatus === "connected";

  return c.json(
    success({
      status: allOk ? "ok" : "degraded",
      database,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "0.0.0",
    }),
    allOk ? 200 : 503,
  );
});

export { app as healthRouter };
