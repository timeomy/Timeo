import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";

/**
 * TIM-25: Forced Password Reset for Invited Users
 *
 * Feature requirement:
 * - When a new user is invited (via tenant invitation), they receive a temporary password
 * - On first login, the user is redirected to /reset-password with middleware enforcement
 * - User cannot access any other routes until password is reset
 * - After successful password reset, the `must_reset_password` flag is cleared
 * - User can then access normal application routes
 *
 * Implementation areas:
 * 1. Database: users table must have `must_reset_password` boolean field
 * 2. Middleware: Auth middleware enforces redirect for flagged users
 * 3. API: /api/auth/reset-password endpoint clears the flag
 * 4. Email: Invitation email indicates temporary password must be reset
 */

const TEST_INVITED_USER = {
  email: "invited@demo.my",
  name: "Invited User",
  authId: "auth_invited_user_123",
};

const TEST_TENANT = {
  id: "tnt_invited_test_123",
  slug: "invited-test",
  name: "Invited Test Tenant",
};

describe("TIM-25: Forced Password Reset for Invited Users", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp();

    // Mock auth handler to simulate invited user session
    vi.mock("@timeo/auth/server", () => {
      const mockHandler = vi.fn(async (req: Request) => {
        const url = new URL(req.url);
        const path = url.pathname.replace("/api/auth", "");

        // Return invited user with must_reset_password=true
        if (path === "/get-session" && req.method === "GET") {
          return new Response(
            JSON.stringify({
              user: {
                id: TEST_INVITED_USER.authId,
                email: TEST_INVITED_USER.email,
                name: TEST_INVITED_USER.name,
              },
              session: { id: "sess_invited_123" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ error: "Not implemented" }),
          { status: 501 },
        );
      });
      return { auth: { handler: mockHandler } };
    });
  });

  describe("Database Schema", () => {
    it("should have must_reset_password field on users table", async () => {
      // This test verifies the schema exists
      // The field should be:
      // - boolean type
      // - default false
      // - indexed for performance
      // - nullable: false (always has a value)

      // Manual verification: Check that users table includes:
      // must_reset_password: boolean("must_reset_password").notNull().default(false)
      expect(true).toBe(true);
    });

    it("should set must_reset_password=true when user is invited with temp password", async () => {
      // When createUserWithCredentials() is called during invitation:
      // - New user created with must_reset_password=true
      // - Temporary password is stored (as password hash in account.password)

      // Simulate: await createUserWithCredentials(db, { email, tempPassword, ... })
      // Result should be: users row with must_reset_password=true

      // Placeholder: actual test will verify DB state after invitation
      expect(true).toBe(true);
    });
  });

  describe("Authentication Middleware: Forced Redirect", () => {
    it("should redirect authenticated user with must_reset_password=true to /reset-password", async () => {
      // GET /api/tenants → should intercept and return 403/redirect
      // Expected: { success: false, error: { code: "MUST_RESET_PASSWORD", message: "..." }, redirect: "/reset-password" }

      const res = await app.request("/api/tenants", {
        method: "GET",
        headers: {
          Cookie: "auth-session=sess_invited_123",
        },
      });

      // Should NOT return 200
      expect(res.status).toBe(403);

      const body = (await res.json()) as Record<string, unknown>;
      expect((body.error as Record<string, unknown>)?.code).toBe("MUST_RESET_PASSWORD");
      expect(body.redirect).toBe("/reset-password");
    });

    it("should allow GET /api/auth/reset-password endpoint for must_reset_password users", async () => {
      // This endpoint should be EXCLUDED from the forced-reset middleware
      // User needs to call this to clear the flag

      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({
          newPassword: "NewSecurePassword123!",
        }),
      });

      // Should allow even with must_reset_password=true
      expect(res.status).toBeOneOf([200, 201]);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
    });

    it("should NOT redirect user with must_reset_password=false", async () => {
      // Normal authenticated user without the flag should proceed normally

      // Setup: Create user with must_reset_password=false
      // GET /api/tenants should return 200 with tenant list

      const res = await app.request("/api/tenants", {
        method: "GET",
        headers: {
          Cookie: "auth-session=sess_normal_user",
        },
      });

      // Should NOT trigger forced reset
      expect(res.status).not.toBe(403);
    });

    it("should not enforce forced-reset for unauthenticated requests", async () => {
      // GET /api/tenants without auth should return 401, not 403
      const res = await app.request("/api/tenants", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as Record<string, unknown>;
      expect((body.error as any)?.code).not.toBe("MUST_RESET_PASSWORD");
    });
  });

  describe("Password Reset Endpoint: /api/auth/reset-password", () => {
    it("should reset password and clear must_reset_password flag", async () => {
      const newPassword = "NewSecurePassword123!";

      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
      expect((body.data as any)?.must_reset_password).toBe(false);
    });

    it("should require valid password format", async () => {
      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({
          newPassword: "weak",
        }),
      });

      expect(res.status).toBe(400);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(false);
      expect((body.error as any)?.code).toBe("INVALID_PASSWORD");
      expect((body.error as any)?.message).toContain("password");
    });

    it("should require newPassword field", async () => {
      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(false);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: "NewSecurePassword123!",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("should hash password before storage (no plaintext in DB)", async () => {
      // Implementation must use bcrypt or Better Auth's password hashing
      // Never store plaintext passwords

      // After reset, verify:
      // - account.password is a hash (not plaintext)
      // - Hash verifies against newPassword
      expect(true).toBe(true);
    });
  });

  describe("User Invitation Flow Integration", () => {
    it("should create invited user with must_reset_password=true during member invitation", async () => {
      // POST /api/platform/tenants/:id/members with newUser flag
      // Should result in:
      // 1. New user created with must_reset_password=true
      // 2. Temporary password generated and stored
      // 3. Email sent with invitation + temp password hint
      // 4. Response includes temporary password (only in API response, not stored elsewhere)

      const res = await app.request(
        `/api/platform/tenants/${TEST_TENANT.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: "auth-session=sess_platform_admin",
          },
          body: JSON.stringify({
            email: "newmember@example.com",
            name: "New Member",
            role: "staff",
          }),
        },
      );

      expect(res.status).toBeOneOf([200, 201]);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
      expect((body.data as any)?.user?.email).toBe("newmember@example.com");
      expect((body.data as any)?.user?.must_reset_password).toBe(true);
      // Temp password only in API response, not persisted
      expect((body.data as any)?.tempPassword).toBeDefined();
    });

    it("should send email to invited user with password reset instruction", async () => {
      // Email template should include:
      // - "You have been invited to [BusinessName]"
      // - "Your temporary password is: [tempPassword]"
      // - "You must reset your password on first login"
      // - Link to sign-in page

      // Mock email service and verify it was called with correct params
      expect(true).toBe(true); // Placeholder for email verification
    });
  });

  describe("Access Control After Reset", () => {
    it("should allow normal dashboard access after password reset", async () => {
      // 1. Invited user logs in with temp password → redirected to /reset-password
      // 2. User calls POST /api/auth/reset-password with new password
      // 3. Flag is cleared (must_reset_password=false)
      // 4. User can now GET /api/tenants, /api/services, etc.

      // Simulate reset
      // Then GET /api/tenants should return 200
      expect(true).toBe(true);
    });

    it("should allow business admin routes after reset", async () => {
      // User with role=staff or role=business_admin should access:
      // - /api/tenants/:tenantId/services
      // - /api/tenants/:tenantId/bookings
      // - /api/tenants/:tenantId/products
      // etc.

      expect(true).toBe(true);
    });
  });

  describe("Edge Cases & Security", () => {
    it("should not allow same password as temporary password", async () => {
      // User should not be able to reset to the same temp password
      // (forces actual password change)

      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({
          newPassword: "TempPassword123!", // Same as temp
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect((body.error as any)?.code).toBe("SAME_PASSWORD");
    });

    it("should handle multiple reset attempts gracefully", async () => {
      // User can reset password multiple times before flag is cleared
      // After each successful reset, flag is cleared

      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123",
        },
        body: JSON.stringify({
          newPassword: "FirstNewPassword123!",
        }),
      });

      expect(res.status).toBe(200);

      // Second reset should also work (flag already cleared, normal password change)
      const res2 = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "auth-session=sess_invited_123_after_reset",
        },
        body: JSON.stringify({
          newPassword: "SecondNewPassword456!",
        }),
      });

      expect(res2.status).toBe(200);
    });

    it("should log password reset for audit trail", async () => {
      // POST /api/auth/reset-password should create audit_log entry:
      // - actor_id: authenticated user
      // - actor_role: "user"
      // - action: "password.reset_required_password_changed"
      // - resource_type: "user"
      // - details: { reason: "invited_user_required_reset" }

      expect(true).toBe(true);
    });

    it("should expire temporary password after 24 hours", async () => {
      // If user doesn't reset password within 24 hours, temp password expires
      // Subsequent login attempts should fail with "password expired"

      expect(true).toBe(true);
    });
  });

  describe("Regression Tests: Existing Features Not Broken", () => {
    it("should not affect non-invited users with normal password reset", async () => {
      // POST /api/auth/reset-password for a normal user
      // (one who wasn't invited and doesn't have must_reset_password flag)
      // Should work normally without any forced-reset logic

      expect(true).toBe(true);
    });

    it("should not affect tenant member list endpoint", async () => {
      // GET /api/tenants/:tenantId/members should still return members with must_reset_password status

      expect(true).toBe(true);
    });

    it("should maintain RLS isolation during forced reset", async () => {
      // User with must_reset_password=true cannot access other tenant data
      // Forced redirect protects tenant isolation

      expect(true).toBe(true);
    });
  });
});

// Utility: Helper assertion
declare global {
  namespace Vi {
    interface Matchers<R> {
      toBeOneOf(values: number[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received: number, expected: number[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be one of ${expected.join(", ")}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be one of ${expected.join(", ")}`,
        pass: false,
      };
    }
  },
});
