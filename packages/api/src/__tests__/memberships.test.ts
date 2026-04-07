import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import {
  TEST_ADMIN,
  TEST_USER,
  TEST_TENANT,
  TEST_MEMBERSHIP_ADMIN,
  TEST_MEMBERSHIP_CUSTOMER,
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
  generateId: vi.fn(() => "mbr_test_id_12345678"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
  tenants: { id: "id" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status" },
  memberships: {
    id: "id",
    tenant_id: "tenant_id",
    name: "name",
    description: "description",
    price: "price",
    currency: "currency",
    interval: "interval",
    duration_months: "duration_months",
    plan_type: "plan_type",
    features: "features",
    is_active: "is_active",
    created_at: "created_at",
  },
  subscriptions: {
    id: "id",
    tenant_id: "tenant_id",
    customer_id: "customer_id",
    membership_id: "membership_id",
    status: "status",
    current_period_start: "current_period_start",
    current_period_end: "current_period_end",
    cancel_at_period_end: "cancel_at_period_end",
  },
  bookings: {},
  bookingEvents: {},
  products: {},
  orders: {},
  orderItems: {},
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
  services: {},
  faceRegistrations: {},
  accessLogs: {},
  turnstileDevices: {},
}));

import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";

const app = createApp();
const MEMBERSHIPS_URL = `/api/tenants/${TEST_TENANT.id}/memberships`;

const authApi = (auth as any).api;
const mockDb = db as any;

const TEST_PLAN = {
  id: "mbr_plan_123456789ab",
  tenant_id: TEST_TENANT.id,
  name: "Monthly Gold",
  description: "Full access monthly plan",
  price: 15000,
  currency: "MYR",
  interval: "monthly",
  duration_months: 1,
  plan_type: "all_access",
  features: ["pool", "gym", "sauna"],
  is_active: true,
  created_at: new Date("2026-01-01"),
};

function setupAuthenticatedUser(
  user: typeof TEST_ADMIN | typeof TEST_USER,
  membership: typeof TEST_MEMBERSHIP_ADMIN | typeof TEST_MEMBERSHIP_CUSTOMER,
) {
  authApi.getSession.mockResolvedValue({
    user: { id: user.authId, email: user.email },
    session: { id: "sess_test" },
  });

  let callCount = 0;
  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([user]);
      if (callCount === 2) return Promise.resolve([membership]);
      if (callCount === 3) return Promise.resolve([membership]); // RBAC
      return Promise.resolve([]);
    }),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.execute.mockResolvedValue(undefined);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

  return { chainEnd };
}

// ─── GET /memberships ────────────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/memberships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(MEMBERSHIPS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns list of membership plans", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn(() => {
        callCount++;
        // After auth lookups (which use limit), this is the actual query
        return Promise.resolve([TEST_PLAN]);
      }),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        return Promise.resolve([]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(MEMBERSHIPS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });

  it("is accessible to customers (no role restriction)", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([TEST_PLAN]),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(MEMBERSHIPS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
  });
});

// ─── GET /memberships/:planId ────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/memberships/:planId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when plan not found", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        return Promise.resolve([]); // plan not found
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(`${MEMBERSHIPS_URL}/mbr_nonexistent123`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "NOT_FOUND");
  });

  it("returns plan details when found", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        return Promise.resolve([TEST_PLAN]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(`${MEMBERSHIPS_URL}/${TEST_PLAN.id}`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });
});

// ─── POST /memberships ────────────────────────────────────────────────────────

describe("POST /api/tenants/:tenantId/memberships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({
        name: "Gold Plan",
        description: "Full access",
        price: 15000,
        currency: "MYR",
        interval: "monthly",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when customer tries to create a plan", async () => {
    setupAuthenticatedUser(TEST_USER, TEST_MEMBERSHIP_CUSTOMER);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Gold Plan",
        description: "Full access",
        price: 15000,
        currency: "MYR",
        interval: "monthly",
      }),
    });

    expect(res.status).toBe(403);
  });

  it("creates a membership plan (admin)", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Gold Plan",
        description: "Full access to all gym facilities",
        price: 15000,
        currency: "MYR",
        interval: "monthly",
        planType: "all_access",
        features: ["pool", "gym", "sauna"],
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("id");
  });

  it("returns 400 for missing required fields", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Incomplete Plan",
        // missing price, interval
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid interval value", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Bad Plan",
        description: "test",
        price: 10000,
        currency: "MYR",
        interval: "weekly", // invalid
      }),
    });

    expect(res.status).toBe(400);
  });

  it("validates price is non-negative integer", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    const res = await app.request(MEMBERSHIPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Bad Price Plan",
        description: "test",
        price: -100,
        currency: "MYR",
        interval: "monthly",
      }),
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /memberships/subscriptions/mine ─────────────────────────────────────

describe("GET /api/tenants/:tenantId/memberships/subscriptions/mine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${MEMBERSHIPS_URL}/subscriptions/mine`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns customer subscriptions", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    const mockSubRow = {
      subscription: {
        id: "sub_test_12345",
        status: "active",
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      plan: { name: "Gold Plan", price: 15000 },
    };

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([]);
      }),
    };

    // The actual subscriptions query resolves without limit
    const subscriptionsChainEnd = {
      where: vi.fn().mockResolvedValue([mockSubRow]),
      leftJoin: vi.fn().mockReturnThis(),
    };

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      // First 2 selects are auth lookups (user + membership)
      if (selectCallCount <= 2) return { from: vi.fn().mockReturnValue(chainEnd) };
      // 3rd select is the subscriptions query
      return { from: vi.fn().mockReturnValue(subscriptionsChainEnd) };
    });

    const res = await app.request(`${MEMBERSHIPS_URL}/subscriptions/mine`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });
});

// ─── POST /memberships/:planId/subscribe ─────────────────────────────────────

describe("POST /api/tenants/:tenantId/memberships/:planId/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${MEMBERSHIPS_URL}/${TEST_PLAN.id}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when plan does not exist", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([]); // plan not found
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(`${MEMBERSHIPS_URL}/mbr_nonexistent123/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "NOT_FOUND");
  });

  it("returns 422 when plan is inactive", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    const inactivePlan = { ...TEST_PLAN, is_active: false };

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([inactivePlan]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(`${MEMBERSHIPS_URL}/${TEST_PLAN.id}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expectError(body, "INACTIVE");
  });

  it("creates subscription for monthly plan", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([TEST_PLAN]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await app.request(`${MEMBERSHIPS_URL}/${TEST_PLAN.id}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("subscriptionId");
  });

  it("creates subscription for yearly plan", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    const yearlyPlan = { ...TEST_PLAN, id: "mbr_yearly_123456789", interval: "yearly" };

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([yearlyPlan]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await app.request(`${MEMBERSHIPS_URL}/${yearlyPlan.id}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("subscriptionId");

    // Verify insert was called (period end should be ~1 year from now)
    const insertCall = mockDb.insert.mock.calls[0];
    expect(insertCall).toBeDefined();
  });

  it("verifies tenant isolation — plan must belong to the correct tenant", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_USER.authId, email: TEST_USER.email },
      session: { id: "sess_test" },
    });

    // Simulate plan not found because tenant_id doesn't match
    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_USER]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]);
        return Promise.resolve([]); // plan not found (different tenant)
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(`${MEMBERSHIPS_URL}/mbr_other_tenant_plan/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "NOT_FOUND");
  });
});
