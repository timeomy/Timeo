import { describe, it, expect, vi } from "vitest";
import { createApp } from "../app.js";
import { expectSuccess } from "./helpers.js";

// Mock @timeo/auth/server (loaded transitively by createApp)
vi.mock("@timeo/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn() },
    handler: vi.fn(async () => new Response("Not Found", { status: 404 })),
  },
}));

// Mock @timeo/db (loaded transitively by createApp)
vi.mock("@timeo/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
  generateId: vi.fn(() => "test_id"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: {},
  tenants: {},
  tenantMemberships: {},
  services: {},
  bookings: {},
  bookingEvents: {},
  products: {},
  orders: {},
  orderItems: {},
  memberships: {},
  subscriptions: {},
  payments: {},
  posTransactions: {},
  checkIns: {},
  sessionPackages: {},
  sessionCredits: {},
  sessionLogs: {},
  vouchers: {},
  voucherRedemptions: {},
  giftCards: {},
  giftCardTransactions: {},
  notifications: {},
  staffAvailability: {},
  businessHours: {},
  blockedSlots: {},
  files: {},
  eInvoiceRequests: {},
  auditLogs: {},
  platformConfig: {},
  featureFlags: {},
}));

const app = createApp();

describe("GET /health", () => {
  it("returns 200 with correct shape", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    const data = expectSuccess(body);

    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("timestamp");
    expect(typeof (data as { timestamp: string }).timestamp).toBe("string");
  });

  it("returns a valid ISO timestamp", async () => {
    const res = await app.request("/health");
    const body = await res.json();
    const data = body.data as { timestamp: string };

    const parsed = new Date(data.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });
});
