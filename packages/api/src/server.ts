import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { initSocketIO } from "./realtime/socket.js";
import { redis, redisSubscriber } from "./lib/redis.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
  // Connect Redis
  await redis.connect();
  await redisSubscriber.connect();
  console.log("Redis connected");

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
