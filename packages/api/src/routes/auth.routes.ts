import { Hono } from "hono";

const app = new Hono();

// Better Auth handler - mounted at /api/auth/*
// All auth routes (sign-in, sign-up, session, etc.) are handled by Better Auth
//
// NOTE: We must buffer the body before passing to auth.handler(). When requests
// are proxied through Next.js (auth-server.ts), @hono/node-server wraps the
// IncomingMessage body as a lazy ReadableStream. better-call's getBody() calls
// request.json() on that stream, which can corrupt chunked-encoded bodies.
// Buffering into an ArrayBuffer gives better-call a clean, seekable body.
app.on(["GET", "POST"], "/*", async (c) => {
  const { auth } = await import("@timeo/auth/server");
  const rawBody = await c.req.arrayBuffer();
  const req = new Request(c.req.raw.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: rawBody.byteLength > 0 ? rawBody : undefined,
  });
  return auth.handler(req);
});

export { app as authRouter };
