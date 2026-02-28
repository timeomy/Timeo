import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "http://localhost:4000"
  );
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

export function joinTenantRoom(tenantId: string): void {
  getSocket().emit("join:tenant", tenantId);
}

export function joinUserRoom(userId: string): void {
  getSocket().emit("join:user", userId);
}
