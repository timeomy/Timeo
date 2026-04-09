import { vi } from "vitest";

// Set environment variables before any modules are imported
process.env.GYM_DEVICE_KEY_SECRET = "test-device-secret-for-tests";
process.env.BETTER_AUTH_SECRET = "test-secret-key-for-tests";
process.env.JWT_SECRET = "test-jwt-secret-for-tests";

// Mock rm-api-sdk — Revenue Monster SDK (not installed in test env)
vi.mock("rm-api-sdk", () => ({
  RMSDK: vi.fn(() => ({
    getClientCredentials: vi.fn().mockResolvedValue({
      accessToken: "mock_token",
      refreshToken: "mock_refresh",
      expiresIn: 7200,
    }),
    Payment: {
      createTransactionUrl: vi.fn().mockResolvedValue({
        item: { url: "https://pay.rm.my/mock", code: "mock_code", qrCodeUrl: "https://qr.rm.my/mock" },
      }),
      getPaymentTransactionById: vi.fn().mockResolvedValue({
        item: { status: "SUCCESS", amount: 100, transactionId: "tx_mock", method: "FPX" },
      }),
      refund: vi.fn().mockResolvedValue({
        item: { transactionId: "refund_mock", status: "SUCCESS" },
      }),
    },
    refreshToken: vi.fn(),
  })),
}));

// Mock Revenue Monster service — for webhook route tests
vi.mock("../services/revenue-monster.service.js", () => ({
  createPayment: vi.fn(),
  createDuitNowQR: vi.fn(),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
  getPaymentStatus: vi.fn(),
  createRefund: vi.fn(),
  isConfigured: vi.fn().mockReturnValue(false),
}));

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

// Mock @timeo/db — database module
vi.mock("@timeo/db", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    TEMPLATE_MIGRATION_WRITE_ALLOWLIST: [
      "tenant_template_assignments",
      "tenant_ui_overrides",
    ],
    db: {
      query: {
        tenantTemplates: {
          findMany: vi.fn().mockResolvedValue([]),
          findOne: vi.fn().mockResolvedValue(null),
        },
      },
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});
