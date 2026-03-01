import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { initSocketIO } from "./realtime/socket.js";
import { redis, redisSubscriber } from "./lib/redis.js";
import { isConfigured as isRMConfigured } from "./services/revenue-monster.service.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
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
