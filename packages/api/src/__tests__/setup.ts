import { vi } from "vitest";

// Mock Redis — used by rate-limit middleware
vi.mock("../lib/redis.js", () => {
  const redisMock = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  };
  return {
    redis: redisMock,
    redisSubscriber: { ...redisMock },
  };
});

// Mock Socket.io realtime — used by services
vi.mock("../realtime/socket.js", () => ({
  initSocketIO: vi.fn(),
  getIO: vi.fn(() => ({
    to: vi.fn(() => ({ emit: vi.fn() })),
  })),
  emitToTenant: vi.fn(),
  emitToUser: vi.fn(),
}));
