import { cors } from "hono/cors";

const origins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(
  ",",
);

export const corsMiddleware = cors({
  origin: origins,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
});
