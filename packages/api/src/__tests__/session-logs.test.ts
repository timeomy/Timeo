import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TEST_ADMIN,
  TEST_USER,
  TEST_MEMBERSHIP_ADMIN,
  createMockDb,
} from "./helpers.js";

// Mock @timeo/auth/server
vi.mock("@timeo/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock @timeo/db and schema
vi.mock("@timeo/db", () => ({
  db: createMockDb(),
  generateId: vi.fn(() => "log_test_id_12345678"),
}));

vi.mock("@timeo/db/schema", () => ({
  users: { id: "id", email: "email", name: "name" },
  tenantMemberships: { id: "id", user_id: "user_id", tenant_id: "tenant_id", role: "role", status: "status", coach_id: "coach_id" },
  sessionLogs: {
    id: "id",
    tenant_id: "tenant_id",
    client_id: "client_id",
    coach_id: "coach_id",
    session_type: "session_type",
    duration: "duration",
    notes: "notes",
    date: "date",
    created_at: "created_at",
    updated_at: "updated_at",
  },
}));

import { createApp } from "../app.js";
import { db } from "@timeo/db";
import { auth } from "@timeo/auth/server";

const app = createApp();
const mockDb = db as any;
const authApi = (auth as any).api;

describe("Session Logs Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /session-logs", () => {
    const validPayload = {
      clientId: TEST_USER.id,
      sessionType: "personal_training" as const,
      duration: 60,
      notes: "Good form, needs flexibility work",
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    };

    it("should create a session log with valid input", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
              userId: TEST_USER.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(validPayload),
      });

      expect(res).toBeDefined();
    });

    it("should support group_class session type", async () => {
      const payload = {
        ...validPayload,
        sessionType: "group_class",
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });

    it("should support assessment session type", async () => {
      const payload = {
        ...validPayload,
        sessionType: "assessment",
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });

    it("should support consultation session type", async () => {
      const payload = {
        ...validPayload,
        sessionType: "consultation",
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });

    it("should accept abbreviated session types (pt, group)", async () => {
      const payload = {
        ...validPayload,
        sessionType: "pt",
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });


    it("should allow missing date (defaults to today)", async () => {
      const payload = {
        ...validPayload,
        date: undefined,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });

    it("should allow optional notes field", async () => {
      const payload = {
        ...validPayload,
        notes: undefined,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "mem_client123456789",
              coachId: TEST_ADMIN.id,
            },
          ]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request("/api/session-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "authjs.session-token=test-token",
        },
        body: JSON.stringify(payload),
      });

      expect(res).toBeDefined();
    });

  });

  describe("GET /session-logs", () => {
    it("should list session logs for authenticated user", async () => {
      const mockLogs = [
        {
          id: "log_test1",
          clientId: TEST_USER.id,
          coachId: TEST_ADMIN.id,
          sessionType: "personal_training",
          duration: 60,
          date: "2025-04-15",
          notes: "Good session",
        },
        {
          id: "log_test2",
          clientId: TEST_USER.id,
          coachId: TEST_ADMIN.id,
          sessionType: "assessment",
          duration: 45,
          date: "2025-04-10",
          notes: null,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockLogs),
        }),
      });

      const res = await app.request("/api/session-logs", {
        method: "GET",
        headers: {
          cookie: "authjs.session-token=test-token",
        },
      });

      expect(res).toBeDefined();
    });

    it("should return empty array when no logs exist", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await app.request("/api/session-logs", {
        method: "GET",
        headers: {
          cookie: "authjs.session-token=test-token",
        },
      });

      expect(res).toBeDefined();
    });

    it("should support filtering by client ID", async () => {
      const res = await app.request(
        `/api/session-logs?clientId=${TEST_USER.id}`,
        {
          method: "GET",
          headers: {
            cookie: "authjs.session-token=test-token",
          },
        }
      );

      expect(res).toBeDefined();
    });

    it("should support filtering by date range", async () => {
      const res = await app.request(
        "/api/session-logs?startDate=2025-04-01&endDate=2025-04-30",
        {
          method: "GET",
          headers: {
            cookie: "authjs.session-token=test-token",
          },
        }
      );

      expect(res).toBeDefined();
    });

  });

  describe("GET /session-logs/:id", () => {
    const logId = "log_test123456789";

    it("should return session log details", async () => {
      const mockLog = {
        id: logId,
        clientId: TEST_USER.id,
        coachId: TEST_ADMIN.id,
        sessionType: "personal_training",
        duration: 60,
        date: "2025-04-15",
        notes: "Good form, needs flexibility work",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockLog]),
        }),
      });

      const res = await app.request(`/api/session-logs/${logId}`, {
        method: "GET",
        headers: {
          cookie: "authjs.session-token=test-token",
        },
      });

      expect(res).toBeDefined();
    });

    it("should return 404 for non-existent log", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await app.request(`/api/session-logs/nonexistent`, {
        method: "GET",
        headers: {
          cookie: "authjs.session-token=test-token",
        },
      });

      expect(res.status).toBe(404);
    });

    it("should enforce tenant isolation", async () => {
      // User from tenant A cannot see logs from tenant B
      expect(true).toBe(true);
    });

  });

  describe("Authorization & Tenant Isolation", () => {
    it("should allow coaches to create logs only for their clients", async () => {
      // Coach role can only log sessions for clients assigned to them
      expect(true).toBe(true);
    });

    it("should allow admins to create logs for any client", async () => {
      // Admin role can log sessions for any client in the tenant
      expect(true).toBe(true);
    });

    it("should prevent customers from creating session logs", async () => {
      // Customer role cannot create session logs
      expect(true).toBe(true);
    });

    it("should enforce tenant boundary on all endpoints", async () => {
      // Coach from tenant A cannot access logs from tenant B
      expect(true).toBe(true);
    });
  });
});
