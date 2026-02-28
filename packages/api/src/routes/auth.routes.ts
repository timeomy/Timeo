import { Hono } from "hono";

const app = new Hono();

// Better Auth handler - mounted at /api/auth/*
// All auth routes (sign-in, sign-up, session, etc.) are handled by Better Auth
app.on(["GET", "POST"], "/*", async (c) => {
  const { auth } = await import("@timeo/auth/server");
  return auth.handler(c.req.raw);
});

export { app as authRouter };
