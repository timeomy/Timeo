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
  TEMPLATE_MIGRATION_WRITE_ALLOWLIST: [
    "tenant_template_assignments",
    "tenant_ui_overrides",
  ],
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
  generateId: vi.fn(() => "gym_test_id_12345678"),
  runTenantTemplateMigration: vi.fn(),
  normalizeIndustry: vi.fn((industry: string) => industry),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name", avatar_url: "avatar_url", nfc_card_id: "nfc_card_id", created_at: "created_at", updated_at: "updated_at", role: "role", force_password_reset: "force_password_reset" },
  tenants: { id: "id", slug: "slug" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status", notes: "notes", tags: "tags", joined_at: "joined_at" },
  checkIns: { id: "id", tenant_id: "tenant_id", user_id: "user_id", method: "method", timestamp: "timestamp", gate: "gate", device: "device", entry_type: "entry_type", notes: "notes" },
  subscriptions: { id: "id", tenant_id: "tenant_id", customer_id: "customer_id", membership_id: "membership_id", status: "status", current_period_start: "current_period_start", current_period_end: "current_period_end", cancel_at_period_end: "cancel_at_period_end" },
  faceRegistrations: { id: "id", tenant_id: "tenant_id", user_id: "user_id", device_sn: "device_sn", device_person_id: "device_person_id", status: "status", registered_at: "registered_at", synced_at: "synced_at" },
  accessLogs: { id: "id", tenant_id: "tenant_id", device_sn: "device_sn", user_id: "user_id", match_result: "match_result" },
  turnstileDevices: { id: "id", device_sn: "device_sn" },
  bookings: {},
  bookingEvents: {},
  products: {},
  orders: {},
  orderItems: {},
  memberships: { id: "id", name: "name" },
  paymentRequests: { id: "id", tenant_id: "tenant_id", customer_id: "customer_id", plan_name: "plan_name", amount: "amount", currency: "currency", status: "status", receipt_url: "receipt_url", member_note: "member_note", admin_note: "admin_note", approved_at: "approved_at", rejected_at: "rejected_at", created_at: "created_at", updated_at: "updated_at" },
  payments: {},
  posTransactions: {},
  sessionPackages: { id: "id", name: "name" },
  sessionCredits: { id: "id", tenant_id: "tenant_id", user_id: "user_id", package_id: "package_id", total_sessions: "total_sessions", used_sessions: "used_sessions", expires_at: "expires_at", purchased_at: "purchased_at" },
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
}));

// Mock services
vi.mock("../services/check-in.service.js", () => ({
  createCheckIn: vi.fn().mockResolvedValue("ci_test_id_1234567"),
}));

vi.mock("../services/access-control.service.js", () => ({
  validateMemberAccess: vi.fn().mockResolvedValue({
    allowed: true,
    reason: "ok",
    memberName: "Test Member",
    userId: "usr_member123456789",
  }),
  logAccessAttempt: vi.fn().mockResolvedValue("log_test_id_12345"),
}));

import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";
import * as AccessControlService from "../services/access-control.service.js";
import * as CheckInService from "../services/check-in.service.js";

const app = createApp();
const GYM_URL = `/api/tenants/${TEST_TENANT.id}/gym`;
// Must match what setup.ts sets in process.env.GYM_DEVICE_KEY_SECRET before module load
const GYM_DEVICE_KEY_SECRET = "test-device-secret-for-tests";

// Type aliases for mock access
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
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
      if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
      if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]); // RBAC
      return Promise.resolve([]);
    }),
    groupBy: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  const selectChain = { from: vi.fn().mockReturnValue(chainEnd) };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.execute.mockResolvedValue(undefined);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });

  return { chainEnd };
}

// ─── POST /gym/checkin ───────────────────────────────────────────────────────

describe("POST /api/tenants/:tenantId/gym/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GYM_DEVICE_KEY_SECRET = GYM_DEVICE_KEY_SECRET;
  });

  it("returns 401 when device key is missing", async () => {
    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ memberId: "TIMEO:test-gym:usr_123:abcdef012345", method: "qr" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expectError(body, "UNAUTHORIZED");
  });

  it("returns 401 when device key is wrong", async () => {
    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-Device-Key": "wrong-secret",
      },
      body: JSON.stringify({ memberId: "TIMEO:test-gym:usr_123:abcdef012345", method: "qr" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expectError(body, "UNAUTHORIZED");
  });

  it("returns 400 for invalid QR code format", async () => {
    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-Device-Key": GYM_DEVICE_KEY_SECRET,
      },
      body: JSON.stringify({ memberId: "INVALID_QR_CODE", method: "qr" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.data.granted).toBe(false);
    expect(body.data.reason).toBe("Invalid QR code format");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-Device-Key": GYM_DEVICE_KEY_SECRET,
      },
      body: JSON.stringify({ memberId: "TIMEO:test-gym:usr_123:abcdef012345" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns denied when member access is not allowed", async () => {
    vi.mocked(AccessControlService.validateMemberAccess).mockResolvedValueOnce({
      allowed: false,
      reason: "subscription_expired",
      memberName: "Expired User",
      userId: "usr_expired12345678",
    });
    vi.mocked(AccessControlService.logAccessAttempt).mockResolvedValueOnce("log_123");
    vi.mocked(CheckInService.createCheckIn).mockResolvedValueOnce("ci_123");

    // Setup database mocks for tenant and subscription queries
    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: TEST_TENANT.id }]); // tenant
        return Promise.resolve([]); // subscriptions - no active
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });

    // Compute actual HMAC for the test
    const crypto = await import("node:crypto");
    const hmac = crypto.createHmac("sha256", GYM_DEVICE_KEY_SECRET)
      .update("test-gym:usr_member123456789")
      .digest("hex")
      .slice(0, 12);

    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-Device-Key": GYM_DEVICE_KEY_SECRET,
      },
      body: JSON.stringify({
        memberId: `TIMEO:test-gym:usr_member123456789:${hmac}`,
        method: "qr",
      }),
    });

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.granted).toBe(false);
    expect(body.data.reason).toBe("subscription_expired");
  });

  it("grants access when member is valid and access allowed", async () => {
    vi.mocked(AccessControlService.validateMemberAccess).mockResolvedValueOnce({
      allowed: true,
      reason: "ok",
      memberName: "Active Member",
      userId: "usr_member123456789",
    });
    vi.mocked(CheckInService.createCheckIn).mockResolvedValueOnce("ci_test_123");
    vi.mocked(AccessControlService.logAccessAttempt).mockResolvedValueOnce("log_456");

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: TEST_TENANT.id }]);
        return Promise.resolve([]); // no active sub
      }),
      and: vi.fn().mockReturnThis(),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const crypto = await import("node:crypto");
    const hmac = crypto.createHmac("sha256", GYM_DEVICE_KEY_SECRET)
      .update("test-gym:usr_member123456789")
      .digest("hex")
      .slice(0, 12);

    const res = await app.request(`${GYM_URL}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-Device-Key": GYM_DEVICE_KEY_SECRET,
      },
      body: JSON.stringify({
        memberId: `TIMEO:test-gym:usr_member123456789:${hmac}`,
        method: "qr",
        deviceId: "device_001",
      }),
    });

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.granted).toBe(true);
    expect(body.data.memberName).toBe("Active Member");
    expect(CheckInService.createCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TEST_TENANT.id,
        userId: "usr_member123456789",
        method: "qr",
      }),
    );
  });
});

// ─── POST /gym/manual-open ───────────────────────────────────────────────────

describe("POST /api/tenants/:tenantId/gym/manual-open", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${GYM_URL}/manual-open`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ deviceSn: "SN001" }),
    });

    expect(res.status).toBe(401);
  });

  it("opens door successfully for admin", async () => {
    setupAuthenticatedAdmin();
    vi.mocked(AccessControlService.logAccessAttempt).mockResolvedValueOnce("log_abc123");

    const res = await app.request(`${GYM_URL}/manual-open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ deviceSn: "SN001", reason: "Instructor override" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("logId");
    expect(data).toHaveProperty("message");
  });

  it("returns 400 for missing deviceSn", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(`${GYM_URL}/manual-open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ reason: "test" }),
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /gym/members ────────────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/gym/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${GYM_URL}/members`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(401);
  });

  it("returns member list with pagination", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    const mockMemberRow = {
      membership: { id: "mem_1", role: "customer", status: "active", notes: null, tags: [], joinedAt: new Date() },
      user: { id: "usr_1", name: "Alice", email: "alice@example.com", avatarUrl: null },
    };

    // Query sequence:
    // 1. Auth middleware: user lookup .where().limit()
    // 2. Tenant middleware: membership check .where().limit()
    // 3. Count query: .innerJoin().where() as terminal
    // 4. Members query: .innerJoin().where().orderBy().limit().offset() as terminal
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Auth middleware: user lookup
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        // Tenant middleware: membership check
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 3) {
        // Count query: .from().innerJoin().where() as terminal
        const ce = { innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([{ count: 1 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Members list query: .from().innerJoin().where().orderBy().limit().offset()
      const ce = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockMemberRow]),
      };
      return { from: vi.fn().mockReturnValue(ce) };
    });

    mockDb.execute.mockResolvedValue([]);

    const res = await app.request(`${GYM_URL}/members`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("members");
    expect(data).toHaveProperty("pagination");
    expect((data as any).pagination).toHaveProperty("total");
    expect((data as any).pagination).toHaveProperty("page");
  });

  it("supports search query parameter", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Auth middleware: user lookup
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        // Tenant middleware: membership check
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 3) {
        // Count query returns 0 results matching "Alice"
        const ce = { innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([{ count: 0 }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Members list query with search
      const ce = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };
      return { from: vi.fn().mockReturnValue(ce) };
    });

    mockDb.execute.mockResolvedValue([]);

    const res = await app.request(`${GYM_URL}/members?search=Alice`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });
});

// ─── GET /gym/members/:id ────────────────────────────────────────────────────

describe("GET /api/tenants/:tenantId/gym/members/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when member not found", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Auth middleware: user lookup
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        // Tenant middleware: membership check
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Member detail lookup — not found
      const ce = { innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) };
      return { from: vi.fn().mockReturnValue(ce) };
    });
    mockDb.execute.mockResolvedValue([]);

    const res = await app.request(`${GYM_URL}/members/usr_nonexistent12345`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "NOT_FOUND");
  });

  it("returns member detail with subscription and face registration info", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    const mockMember = {
      user: { id: "usr_member123456789", name: "Alice", email: "alice@example.com", avatarUrl: null, createdAt: new Date() },
      membership: { id: "mem_1", role: "customer", status: "active", notes: null, tags: [], memberId: "mem_card_001", joinedAt: new Date(), coachId: null },
    };

    const mockActiveSub = {
      id: "sub_test_12345",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    };

    // Queries made:
    // 1. Auth middleware: user lookup
    // 2. Tenant middleware: membership check
    // 3. Member detail: .innerJoin().where().limit(1)
    // 4. Tenant lookup: .where().limit(1)
    // 5. Subscription: .leftJoin().where().orderBy().limit(1)
    // 6. Face registrations: .where()
    // 7. Check-ins: .where().orderBy()
    // 8. Payment history: .where().orderBy()
    // 9. Session credits: .leftJoin().where().orderBy()
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Auth middleware: user lookup
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 2) {
        // Tenant middleware: membership check
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([TEST_MEMBERSHIP_ADMIN]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 3) {
        // Member detail: .innerJoin().where().limit()
        const ce = { innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([mockMember]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 4) {
        // Tenant lookup: .where().limit()
        const ce = { where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ slug: "ws_fitness" }]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 5) {
        // Subscription: .leftJoin().where().orderBy().limit()
        const ce = { leftJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([mockActiveSub]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 6) {
        // Face registrations: .where()
        const ce = { where: vi.fn().mockResolvedValue([]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 7) {
        // Check-ins: .where().orderBy() [no limit]
        const ce = { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockResolvedValue([]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 8) {
        // Payment history: .where().orderBy()
        const ce = { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockResolvedValue([]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      if (selectCallCount === 9) {
        // Session credits: .leftJoin().where().orderBy()
        const ce = { leftJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockResolvedValue([]) };
        return { from: vi.fn().mockReturnValue(ce) };
      }
      // Fallback for any additional queries
      const ce = { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), leftJoin: vi.fn().mockReturnThis(), innerJoin: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) };
      return { from: vi.fn().mockReturnValue(ce) };
    });

    mockDb.execute.mockResolvedValue([]);

    const res = await app.request(`${GYM_URL}/members/usr_member123456789`, {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("user");
    expect(data).toHaveProperty("membership");
    expect(data).toHaveProperty("subscription");
    expect(data).toHaveProperty("faceRegistration");
    expect(data).toHaveProperty("recentCheckIns");
  });
});

// ─── POST /gym/members/:id/photo ─────────────────────────────────────────────

describe("POST /api/tenants/:tenantId/gym/members/:id/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    authApi.getSession.mockResolvedValue(null);

    const res = await app.request(`${GYM_URL}/members/usr_123/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ photoUrl: "https://cdn.example.com/photo.jpg" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when member not in this tenant", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    // Mock all database queries:
    // 1. Auth middleware: user lookup → TEST_ADMIN
    // 2. Tenant middleware: membership check → TEST_MEMBERSHIP_ADMIN
    // 3. Photo endpoint: member check → empty (member not in this tenant)
    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);        // Auth middleware
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]); // Tenant middleware
        return Promise.resolve([]);                                         // Photo endpoint: no membership
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });
    mockDb.execute.mockResolvedValue([]);

    const res = await app.request(`${GYM_URL}/members/usr_other_tenant/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ photoUrl: "https://cdn.example.com/photo.jpg" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectError(body, "NOT_FOUND");
  });

  it("returns 400 for invalid photoUrl", async () => {
    setupAuthenticatedAdmin();

    const res = await app.request(`${GYM_URL}/members/usr_member123456789/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ photoUrl: "not-a-url" }),
    });

    expect(res.status).toBe(400);
  });

  it("uploads photo successfully", async () => {
    authApi.getSession.mockResolvedValue({
      user: { id: TEST_ADMIN.authId, email: TEST_ADMIN.email },
      session: { id: "sess_test" },
    });

    let callCount = 0;
    const chainEnd = {
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([TEST_ADMIN]);
        if (callCount === 2) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        if (callCount === 3) return Promise.resolve([TEST_MEMBERSHIP_ADMIN]);
        // Membership exists
        return Promise.resolve([{ id: "mem_1" }]);
      }),
    };
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue(chainEnd) });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    const res = await app.request(`${GYM_URL}/members/usr_member123456789/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ photoUrl: "https://cdn.example.com/photo.jpg" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("userId");
    expect(data).toHaveProperty("avatarUrl", "https://cdn.example.com/photo.jpg");
  });
});
