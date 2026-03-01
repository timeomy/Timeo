import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { ServerType } from "@hono/node-server";
import { redis, redisSubscriber } from "../lib/redis.js";

let io: SocketIOServer;

export function initSocketIO(httpServer: ServerType): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(
        ",",
      ),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.adapter(createAdapter(redis, redisSubscriber));

  io.on("connection", (socket) => {
    socket.on("join:tenant", (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
    });
    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function emitToTenant(
  tenantId: string,
  event: string,
  data: unknown,
) {
  getIO().to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data);
}
