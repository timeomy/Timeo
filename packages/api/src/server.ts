import { createServer } from "node:http";
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

  const httpServer = createServer();

  // Attach Socket.io to the HTTP server
  initSocketIO(httpServer);

  // Use Hono as the HTTP handler
  serve(
    { fetch: app.fetch, port: PORT, serverOptions: { server: httpServer } },
    (info) => {
      console.log(`API server running on http://localhost:${info.port}`);
    },
  );
}

main().catch(console.error);
