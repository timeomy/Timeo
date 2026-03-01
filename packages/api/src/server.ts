import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { initSocketIO } from "./realtime/socket.js";
import { redis, redisSubscriber } from "./lib/redis.js";
import { isConfigured as isRMConfigured } from "./services/revenue-monster.service.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

function validateEnv(): void {
  const required: Array<{ name: string; minLength?: number }> = [
    { name: "DATABASE_URL" },
    { name: "REDIS_URL" },
    { name: "BETTER_AUTH_SECRET", minLength: 32 },
    { name: "JWT_SECRET", minLength: 32 },
    { name: "SITE_URL" },
    { name: "API_URL" },
  ];

  const missing: string[] = [];

  for (const { name, minLength } of required) {
    const value = process.env[name];
    if (!value) {
      missing.push(`  - ${name} (required)`);
    } else if (minLength && value.length < minLength) {
      missing.push(`  - ${name} (must be at least ${minLength} characters, got ${value.length})`);
    }
  }

  if (missing.length > 0) {
    console.error("Fatal: missing or invalid environment variables:\n" + missing.join("\n"));
    process.exit(1);
  }

  // Warn about optional vars in production
  if (process.env.NODE_ENV === "production") {
    if (!process.env.RESEND_API_KEY) {
      console.warn("Warning: RESEND_API_KEY not set — emails will not be sent");
    }
    if (!process.env.REVENUE_MONSTER_CLIENT_ID) {
      console.warn("Warning: REVENUE_MONSTER_CLIENT_ID not set — Revenue Monster payments disabled");
    }
  }
}

async function main() {
  validateEnv();

  // Connect Redis
  await redis.connect();
  await redisSubscriber.connect();
  console.log("Redis connected");

  // Log payment gateway availability
  if (isRMConfigured()) {
    console.log("Revenue Monster: configured (%s)", process.env.REVENUE_MONSTER_ENVIRONMENT ?? "sandbox");
  } else {
    console.log("Revenue Monster: not configured (set REVENUE_MONSTER_CLIENT_ID, REVENUE_MONSTER_CLIENT_SECRET, REVENUE_MONSTER_PRIVATE_KEY_PATH)");
  }

  const app = createApp();

  // serve() returns the underlying Node.js HTTP server — attach Socket.io to it
  const httpServer = serve(
    { fetch: app.fetch, port: PORT },
    (info) => {
      console.log(`API server running on http://localhost:${info.port}`);
    },
  );

  initSocketIO(httpServer);
}

main().catch(console.error);
