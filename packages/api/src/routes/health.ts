import { Hono } from "hono";
import { success } from "../lib/response.js";

const app = new Hono();

app.get("/", (c) => {
  return c.json(
    success({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "0.0.0",
    }),
  );
});

export { app as healthRouter };
