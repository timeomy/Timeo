import { createMiddleware } from "hono/factory";
import { redis } from "../lib/redis.js";

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}

export function rateLimit({
  windowMs = 60_000,
  max = 100,
  keyPrefix = "rl",
}: RateLimitOptions = {}) {
  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown";
    const key = `${keyPrefix}:${ip}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);

    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - current)));

    if (current > max) {
      return c.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many requests" },
        },
        429,
      );
    }

    await next();
  });
}
