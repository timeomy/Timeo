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
  generateId: vi.fn(() => "bkg_test_id_12345678"),
}));

// Mock @timeo/db/schema
vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", auth_id: "auth_id", email: "email", name: "name" },
  tenants: { id: "id" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status" },
  services: { id: "id", tenant_id: "tenant_id", name: "name", duration_minutes: "duration_minutes", price: "price" },
  bookings: { id: "id", tenant_id: "tenant_id", customer_id: "customer_id", service_id: "service_id", staff_id: "staff_id", start_time: "start_time", end_time: "end_time", status: "status", notes: "notes", created_at: "created_at", updated_at: "updated_at" },
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

// Mock booking service
vi.mock("../services/booking.service.js", () => ({
  createBooking: vi.fn().mockResolvedValue("bkg_new_booking_1234"),
  confirmBooking: vi.fn().mockResolvedValue(undefined),
  cancelBooking: vi.fn().mockResolvedValue(undefined),
  completeBooking: vi.fn().mockResolvedValue(undefined),
  markNoShow: vi.fn().mockResolvedValue(undefined),
}));

// Import the mocked modules — vi.mock() is hoisted above imports
import { auth } from "@timeo/auth/server";
import { db } from "@timeo/db";
import * as BookingService from "../services/booking.service.js";

const app = createApp();
const BOOKINGS_URL = `/api/tenants/${TEST_TENANT.id}/bookings`;

// Type aliases for mock access
const authApi = (auth as any).api;
const mockDb = db as any;

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
    limit: vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([user]);
      if (callCount === 2) return Promise.resolve([membership]);
      if (callCount === 3) return Promise.resolve([membership]); // RBAC
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

  return { chainEnd };
}

describe("POST /api/tenants/:tenantId/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a booking with valid data", async () => {
    setupAuthenticatedUser(TEST_USER, TEST_MEMBERSHIP_CUSTOMER);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const res = await app.request(BOOKINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        serviceId: "svc_test_123456",
        startTime: tomorrow.toISOString(),
        notes: "First visit",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const data = expectSuccess(body);
    expect(data).toHaveProperty("bookingId");
  });

  it("returns 400 for missing serviceId", async () => {
    setupAuthenticatedUser(TEST_USER, TEST_MEMBERSHIP_CUSTOMER);

    const res = await app.request(BOOKINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        startTime: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 422 when booking service throws", async () => {
    setupAuthenticatedUser(TEST_USER, TEST_MEMBERSHIP_CUSTOMER);

    vi.mocked(BookingService.createBooking).mockRejectedValueOnce(
      new Error("Service is not currently available"),
    );

    const res = await app.request(BOOKINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        serviceId: "svc_inactive",
        startTime: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expectError(body, "BOOKING_ERROR");
  });
});

describe("PATCH /api/tenants/:tenantId/bookings/:bookingId/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms a booking (admin/staff)", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    const res = await app.request(
      `${BOOKINGS_URL}/bkg_existing_123456/confirm`,
      {
        method: "PATCH",
        headers: { Origin: "http://localhost:3000" },
      },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });

  it("returns 422 when confirm fails", async () => {
    setupAuthenticatedUser(TEST_ADMIN, TEST_MEMBERSHIP_ADMIN);

    vi.mocked(BookingService.confirmBooking).mockRejectedValueOnce(
      new Error("Only pending bookings can be confirmed"),
    );

    const res = await app.request(
      `${BOOKINGS_URL}/bkg_already_confirmed/confirm`,
      {
        method: "PATCH",
        headers: { Origin: "http://localhost:3000" },
      },
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expectError(body, "BOOKING_ERROR");
  });
});

describe("PATCH /api/tenants/:tenantId/bookings/:bookingId/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels a booking with reason", async () => {
    setupAuthenticatedUser(TEST_USER, TEST_MEMBERSHIP_CUSTOMER);

    const res = await app.request(
      `${BOOKINGS_URL}/bkg_existing_123456/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ reason: "Schedule conflict" }),
      },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSuccess(body);
  });
});
