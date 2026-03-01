import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import { TEST_ADMIN, expectSuccess, expectError } from "./helpers.js";

// Mock @timeo/auth/server — the auth router delegates to auth.handler()
vi.mock("@timeo/auth/server", () => {
  const mockHandler = vi.fn(async (req: Request) => {
    const url = new URL(req.url);
    const path = url.pathname.replace("/api/auth", "");

    // Simulate Better Auth session endpoint
    if (path === "/get-session" && req.method === "GET") {
      return new Response(
        JSON.stringify({
          user: {
            id: TEST_ADMIN.authId,
            email: TEST_ADMIN.email,
            name: TEST_ADMIN.name,
          },
          session: { id: "sess_test_123" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Simulate sign-up
    if (path === "/sign-up/email" && req.method === "POST") {
      return new Response(
        JSON.stringify({
          user: { id: "auth_new_user", email: "new@example.com" },
          session: { id: "sess_new" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Simulate sign-in
    if (path === "/sign-in/email" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if ((body as { email?: string }).email === "wrong@example.com") {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
          session: { id: "sess_login" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Simulate sign-out
    if (path === "/sign-out" && req.method === "POST") {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Not Found", { status: 404 });
  });

  return {
    auth: {
      api: {
        getSession: vi.fn(),
      },
      handler: mockHandler,
    },
  };
});

// Mock @timeo/db (not used directly by auth routes, but imported by middleware)
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

vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
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

describe("Auth Routes - /api/auth/*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/sign-up/email", () => {
    it("creates a new user account", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "new@example.com",
          password: "SecurePass123!",
          name: "New User",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("user");
      expect(body.user).toHaveProperty("email", "new@example.com");
    });
  });

  describe("POST /api/auth/sign-in/email", () => {
    it("signs in with valid credentials", async () => {
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: TEST_ADMIN.email,
          password: "password123",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("session");
    });

    it("rejects invalid credentials", async () => {
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "wrong@example.com",
          password: "wrongpass",
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/get-session", () => {
    it("returns current session", async () => {
      const res = await app.request("/api/auth/get-session", {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("session");
    });
  });

  describe("POST /api/auth/sign-out", () => {
    it("signs out successfully", async () => {
      const res = await app.request("/api/auth/sign-out", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      });

      expect(res.status).toBe(200);
    });
  });
});
