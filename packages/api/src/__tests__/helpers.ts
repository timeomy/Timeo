import { vi } from "vitest";

// ─── Mock User & Tenant Data ─────────────────────────────────────────────────

export const TEST_USER = {
  id: "usr_test123456789ab",
  email: "test@example.com",
  name: "Test User",
  authId: "auth_test123456789",
};

export const TEST_ADMIN = {
  id: "usr_admin12345678ab",
  email: "admin@example.com",
  name: "Test Admin",
  authId: "auth_admin12345678",
};

export const TEST_TENANT = {
  id: "tnt_test123456789ab",
  name: "Test Business",
  slug: "test-biz",
  owner_id: TEST_ADMIN.id,
  plan: "free",
  status: "active",
  settings: {},
  branding: {},
  payment_gateway: "stripe",
  e_invoice_profile: null,
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
};

export const TEST_MEMBERSHIP_ADMIN = {
  id: "mem_admin12345678ab",
  user_id: TEST_ADMIN.id,
  tenant_id: TEST_TENANT.id,
  role: "admin" as const,
  status: "active" as const,
  joined_at: new Date("2025-01-01"),
};

export const TEST_MEMBERSHIP_CUSTOMER = {
  id: "mem_cust123456789ab",
  user_id: TEST_USER.id,
  tenant_id: TEST_TENANT.id,
  role: "customer" as const,
  status: "active" as const,
  joined_at: new Date("2025-01-01"),
};

// ─── Mock DB Builder ─────────────────────────────────────────────────────────

export interface MockQueryChain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock db object that matches the Drizzle query builder pattern.
 * Override specific return values per test via `mockDb.select.mockReturnValue(...)`.
 */
export function createMockDb() {
  const chainEnd = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };

  // Make where/orderBy/groupBy/leftJoin/innerJoin return chainEnd with limit resolving to []
  for (const method of ["where", "orderBy", "groupBy", "leftJoin", "innerJoin"] as const) {
    chainEnd[method] = vi.fn().mockReturnValue(chainEnd);
  }
  chainEnd.limit = vi.fn().mockResolvedValue([]);

  const selectChain = {
    from: vi.fn().mockReturnValue(chainEnd),
  };

  const insertChain = {
    values: vi.fn().mockResolvedValue(undefined),
  };

  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    delete: vi.fn().mockReturnValue(deleteChain),
    execute: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    // Keep references for assertions
    _selectChain: selectChain,
    _chainEnd: chainEnd,
    _insertChain: insertChain,
    _updateChain: updateChain,
    _deleteChain: deleteChain,
  };
}

// ─── Response Assertion Helpers ──────────────────────────────────────────────

export function expectSuccess(body: unknown) {
  const b = body as { success: boolean; data: unknown };
  expect(b.success).toBe(true);
  expect(b).toHaveProperty("data");
  return b.data;
}

export function expectError(body: unknown, code: string) {
  const b = body as { success: boolean; error: { code: string; message: string } };
  expect(b.success).toBe(false);
  expect(b.error).toBeDefined();
  expect(b.error.code).toBe(code);
  return b.error;
}
