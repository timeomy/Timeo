/**
 * Auth proxy for Next.js App Router.
 * Forwards all /api/auth/* requests to the Hono API server.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function proxyAuth(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = `${API_URL}${url.pathname}${url.search}`;
  const res = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-ignore — Node.js requires duplex for streaming request bodies
    duplex: "half",
  });
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export const handler = {
  GET: proxyAuth,
  POST: proxyAuth,
};
