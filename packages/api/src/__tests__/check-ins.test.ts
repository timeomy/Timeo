import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import {
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
  generateId: vi.fn(() => "ci_test_id_12345678"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
  tenants: { id: "id" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status" },
  checkIns: {
    id: "id",
    tenant_id: "tenant_id",
    user_id: "user_id",
    method: "method",
    timestamp: "timestamp",
    checked_in_by: "checked_in_by",
  },
  memberships: {},
  subscriptions: {},
  bookings: {},
  bookingEvents: {},
  products: {},
  orders: {},
  orderItems: {},
  payments: {},
  posTransactions: {},
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

// Mock check-in service
vi.mock("../services/check-in.service.js", () => ({
  createCheckIn: vi.fn().mockResolvedValue("ci_new_id_12345678"),
}));

import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";
import * as CheckInService from "../services/check-in.service.js";

const app = createApp();
const CHECK_INS_URL = `/api/tenants/${TEST_TENANT.id}/check-ins`;

const authApi = (auth as any).api;
const mockDb = db as any;

function setupAuthenticatedAdmin() {
  authApi.getSession.mockResolvedValue({
    user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
    session: { id: "sess_test" },
  });

  let callCount = 0;
  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
      if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
      if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]); // RBAC
      return Promise.resolve([{ count: 0 }]);
    }),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

  return { chainEnd };
}

// ─── GET /check-ins/stats ────────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/check-ins/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${CHECK_INS_URL}/stats`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns check-in statistics", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    // Stats endpoint query sequence:
    // 1. User lookup: .where().limit()
    // 2. Membership lookup: .where().limit()
    // 3. RBAC check: .where().limit()
    // 4–7. Count queries (today/week/month/unique): .where() as terminal
    // 8. Method breakdown: .where().groupBy() as terminal
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 3) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 4) {
        // Today count — .where() as terminal
        const ce = { where: vi.fn().mockResolvedValue([{ count: 10 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 5) {
        // Week count
        const ce = { where: vi.fn().mockResolvedValue([{ count: 50 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 6) {
        // Month count
        const ce = { where: vi.fn().mockResolvedValue([{ count: 200 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 7) {
        // Unique today count
        const ce = { where: vi.fn().mockResolvedValue([{ count: 8 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Method breakdown — .where().groupBy() as terminal
      const ce = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { method: "qr", count: 5 },
          { method: "nfc", count: 2 },
        ]),
      };
      return { from: vi.fn().mockReturnValue(ce) };
    });

    const res = await app.request(`${CHECK_INS_URL}/stats`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("today");
    expect(data).toHaveProperty("thisWeek");
    expect(data).toHaveProperty("monthCount");
    expect(data).toHaveProperty("uniqueToday");
    expect(data).toHaveProperty("byMethod");
    expect((data as any).byMethod).toHaveProperty("qr");
    expect((data as any).byMethod).toHaveProperty("nfc");
    expect((data as any).byMethod).toHaveProperty("manual");
  });

  it("returns zero stats when no check-ins exist", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 3) {
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount <= 7) {
        // Count queries (today, week, month, unique)
        const ce = { where: vi.fn().mockResolvedValue([{ count: 0 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Method breakdown — empty
      const ce = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([]),
      };
      return { from: vi.fn().mockReturnValue(ce) };
    });

    const res = await app.request(`${CHECK_INS_URL}/stats`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body) as any;
    expect(data.byMethod.qr).toBe(0);
    expect(data.byMethod.nfc).toBe(0);
    expect(data.byMethod.manual).toBe(0);
  });
});

// ─── GET /check-ins ───────────────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/check-ins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(CHECK_INS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns list of check-ins with user info", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    const mockCheckIn = {
      checkIn: {
        id: "ci_test_12345678",
        tenant_id: TEST_TENANT.id,
        user_id: TEST_ADMIN.id,
        method: "qr",
        timestamp: new Date(),
        checked_in_by: null,
      },
      user: { name: "Test Admin", email: "admin@example.com" },
    };

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([mockCheckIn]),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        return Promise.resolve([]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(CHECK_INS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });

  it("returns 403 for customer role (staff/admin only)", async () => {
    const TEST_USER = {
      id: "usr_test123456789ab",
      email: "test@example.com",
      name: "Test User",
      authId: "auth_test123456789",
    };
    const TEST_MEMBERSHIP_CUSTOMER = {
      id: "mem_cust123456789ab",
      user_id: TEST_USER.id,
      tenant_id: TEST_TENANT.id,
      role: "customer" as const,
      status: "active" as const,
      joined_at: new Date("2025-01-01"),
    };

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
        if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_CUSTOMER]); // RBAC check
        return Promise.resolve([]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    const res = await app.request(CHECK_INS_URL, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(403);
  });
});

// ─── POST /check-ins ──────────────────────────────────────────────────────────

describe("POST /api/tenants/:tenantId/check-ins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ userId: "usr_target123456789", method: "manual" }),
    });

    expect(res.status).toBe(401);
  });

  it("creates a check-in with valid data", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        userId: "usr_target123456789",
        method: "manual",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("checkInId");
    expect(CheckInService.createCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TEST_TENANT.id,
        userId: "usr_target123456789",
        method: "manual",
        checkedInBy: TEST_ADMIN.id,
      }),
    );
  });

  it("creates a QR check-in", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        userId: "usr_target123456789",
        method: "qr",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expectSuccess(body);
  });

  it("returns 400 for missing userId", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ method: "manual" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid method", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        userId: "usr_target123456789",
        method: "face", // invalid — not in enum
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 422 when check-in service throws", async () => {
    setupAuthenticatedAdmin();

    vi.mocked(CheckInService.createCheckIn).mockRejectedValueOnce(
      new Error("Member not found"),
    );

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        userId: "usr_nonexistent12345",
        method: "manual",
      }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expectError(body, "CHECKIN_ERROR");
  });

  it("verifies tenant isolation — uses tenantId from path, not request body", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(CHECK_INS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        userId: "usr_target123456789",
        method: "manual",
      }),
    });

    expect(res.status).toBe(201);

    // Verify tenantId from path was used (not from any body field)
    expect(CheckInService.createCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TEST_TENANT.id,
      }),
    );
  });
});
