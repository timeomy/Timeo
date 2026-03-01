import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import {
  TEST_ADMIN,
  TEST_TENANT,
  TEST_MEMBERSHIP_ADMIN,
  expectSuccess,
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
  generateId: vi.fn(() => "svc_test_id_12345678"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
  tenants: { id: "id" },
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
const SERVICES_URL = `/api/tenants/${TEST_TENANT.id}/services`;

// Type aliases for mock access
const authApi = (auth as any).api;
const mockDb = db as any;

const TEST_SERVICE = {
  id: "svc_existing_123456",
  tenant_id: TEST_TENANT.id,
  name: "Haircut",
  description: "A basic haircut",
  duration_minutes: 30,
  price: 3500,
  currency: "MYR",
  image_url: null,
  is_active: true,
  created_by: TEST_ADMIN.id,
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
};

function setupAuthenticatedAdmin() {
  authApi.getSession.mockResolvedValue({
    user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
    session: { id: "sess_test" },
  });

  let callCount = 0;

  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
      if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
      if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]); // RBAC check
      return Promise.resolve([]);
    }),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.execute.mockResolvedValue(undefined);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });

  return { chainEnd };
}

describe("GET /api/tenants/:tenantId/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of services for tenant", async () => {
    const { chainEnd } = setupAuthenticatedAdmin();

    // Override: after auth+tenant middleware, the route handler does its own select
    // The orderBy chain returns the services list
    chainEnd.orderBy.mockResolvedValueOnce([TEST_SERVICE]);

    const res = await app.request(SERVICES_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});

describe("POST /api/tenants/:tenantId/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a service with valid data (admin)", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(SERVICES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Massage",
        description: "Relaxing full body massage",
        durationMinutes: 60,
        price: 8000,
        currency: "MYR",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    const data = expectSuccess(body);
    expect(data).toHaveProperty("id");
  });

  it("returns 400 for missing required fields", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(SERVICES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Massage",
        // Missing: description, durationMinutes, price
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative price", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(SERVICES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Massage",
        description: "A massage",
        durationMinutes: 60,
        price: -100,
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tenants/:tenantId/services/:serviceId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes (deactivates) a service", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(`${SERVICES_URL}/${TEST_SERVICE.id}`, {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expectSuccess(body);
    expect(mockDb.update).toHaveBeenCalled();
  });
});
