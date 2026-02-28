import type { Context } from "hono";

export async function errorHandler(err: Error, c: Context) {
  console.error(
    `[${new Date().toISOString()}] Error:`,
    err.message,
    err.stack,
  );

  if (err.message.includes("UNAUTHORIZED") || err.message.includes("Authentication required")) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      401,
    );
  }

  if (err.message.includes("FORBIDDEN") || err.message.includes("Insufficient permissions")) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: err.message },
      },
      403,
    );
  }

  if (err.message.includes("not found") || err.message.includes("Not found")) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: err.message },
      },
      404,
    );
  }

  return c.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    },
    500,
  );
}
