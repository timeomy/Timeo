import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import {
  TEST_USER,
  TEST_ADMIN,
  TEST_TENANT,
  TEST_MEMBERSHIP_ADMIN,
  expectSuccess,
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

// Mock tenant service
vi.mock("../services/tenant.service.js", () => ({
  createTenant: vi.fn().mockResolvedValue("tnt_new_id_12345678"),
  updateTenantSettings: vi.fn().mockResolvedValue(undefined),
  updateTenantBranding: vi.fn().mockResolvedValue(undefined),
}));

// Import the mocked modules — vi.mock() is hoisted above imports
import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";

const app = createApp();

// Type aliases for mock access
const authApi = (auth as any).api;
const mockDb = db as any;

function setupAuth(user: typeof TEST_ADMIN | typeof TEST_USER | null) {
  if (user) {
    authApi.getSession.mockResolvedValue({
      user: { id: user.authId, email: user.email },
      session: { id: "sess_test" },
    });
  } else {
    authApi.getSession.mockResolvedValue(null);
  }
}

function setupDbForAuthenticatedAdmin() {
  let callCount = 0;

  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
      return Promise.resolve([]);
    }),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

  return { chainEnd };
}

describe("GET /api/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await app.request("/api/tenants", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expectError(body, "UNAUTHORIZED");
  });

  it("returns user tenants when authenticated", async () => {
    setupAuth(TEST_ADMIN);

    const memberships = [
      { membership: TEST_MEMBERSHIP_ADMIN, tenant: TEST_TENANT },
    ];

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        return Promise.resolve([TEST_ADMIN]);
      }),
      orderBy: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(memberships),
      }),
      innerJoin: vi.fn().mockReturnThis(),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request("/api/tenants", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});

describe("GET /api/tenants/by-slug/:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant by slug (public endpoint)", async () => {
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([TEST_TENANT]),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request("/api/tenants/by-slug/test-biz", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const data = expectSuccess(body);
    expect(data).toHaveProperty("id", TEST_TENANT.id);
  });

  it("returns 404 for unknown slug", async () => {
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request("/api/tenants/by-slug/unknown", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expectError(body, "NOT_FOUND");
  });
});

describe("POST /api/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a tenant when authenticated with valid data", async () => {
    setupAuth(TEST_ADMIN);

    let callCount = 0;

    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]); // auth user lookup
        return Promise.resolve([]); // slug uniqueness check — not taken
      }),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "New Business",
        slug: "new-biz",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    const data = expectSuccess(body);
    expect(data).toHaveProperty("tenantId");
  });

  it("returns 409 when slug is already taken", async () => {
    setupAuth(TEST_ADMIN);

    let callCount = 0;

    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        return Promise.resolve([TEST_TENANT]); // slug already exists
      }),
    };
    const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
    mockDb.select.mockReturnValue(selectChain);

    const res = await app.request("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Duplicate",
        slug: "test-biz",
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expectError(body, "CONFLICT");
  });

  it("returns 400 for invalid slug format", async () => {
    setupAuth(TEST_ADMIN);
    setupDbForAuthenticatedAdmin();

    const res = await app.request("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Test",
        slug: "INVALID SLUG!",
      }),
    });

    expect(res.status).toBe(400);
  });
});
