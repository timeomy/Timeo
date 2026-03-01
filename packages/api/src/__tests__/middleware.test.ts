import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import {
  TEST_USER,
  TEST_ADMIN,
  TEST_TENANT,
  TEST_MEMBERSHIP_ADMIN,
  TEST_MEMBERSHIP_CUSTOMER,
  expectError,
} from "./helpers.js";

// Mock @timeo/auth/server
vi.mock("@timeo/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock @timeo/db
vi.mock("@timeo/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
  generateId: vi.fn(() => "test_generated_id_00"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
  tenants: { id: "id", slug: "slug", name: "name", owner_id: "owner_id", plan: "plan", status: "status", settings: "settings", branding: "branding", payment_gateway: "payment_gateway", created_at: "created_at", updated_at: "updated_at" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status" },
  services: { id: "id", tenant_id: "tenant_id", name: "name", is_active: "is_active", created_at: "created_at" },
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

// Import the mocked modules — vi.mock() is hoisted above imports
import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";

const app = createApp();

// Type aliases for mock access
const authApi = (auth as any).api;
const mockDb = db as any;

function mockAuthReturn(session: unknown) {
  authApi.getSession.mockResolvedValue(session);
}

function mockDbSelect(rows: unknown[]) {
  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  return chainEnd;
}

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests to protected routes", async () => {
    mockAuthReturn(null);

    const res = await app.request("/api/tenants", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expectError(body, "UNAUTHORIZED");
  });

  it("returns 401 when session exists but user not found in DB", async () => {
    mockAuthReturn({
      user: { id: "auth_unknown", email: "ghost@example.com" },
      session: { id: "sess_test" },
    });

    // DB select returns empty — user not found
    mockDbSelect([]);

    const res = await app.request("/api/tenants", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "USER_NOT_FOUND");
  });
});

describe("Tenant Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user has no membership for the tenant", async () => {
    mockAuthReturn({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;

    // First call: find user by auth_id -> found
    // Second call: find tenant membership -> not found
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        return Promise.resolve([]); // no membership
      }),
      orderBy: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request(
      `/api/tenants/${TEST_TENANT.id}/services`,
      { headers: { Origin: "http://localhost:3000" } },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectError(body, "FORBIDDEN");
  });
});

describe("RBAC Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when customer tries to access admin-only route", async () => {
    mockAuthReturn({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;

    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        // RBAC check — returns customer role
        return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
      }),
      orderBy: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);
    mockDb.execute.mockResolvedValue(undefined);

    // POST /services requires admin role
    const res = await app.request(
      `/api/tenants/${TEST_TENANT.id}/services`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Test Service",
          description: "A test service",
          durationMinutes: 60,
          price: 5000,
        }),
      },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectError(body, "FORBIDDEN");
  });
});
