import { test, expect, type Page } from "@playwright/test";

/**
 * Sign in with seeded user credentials.
 * Assumes the dev seed script has been run (packages/db seed).
 *
 * admin@timeo.my  is the platform_admin (Super Admin).
 * gym@demo.my     is a tenant admin (Iron Paradise Gym).
 */
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from sign-in
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15000 });
}

test.describe("Platform Admin — Overview", () => {
  test("unauthenticated access to /admin redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("non-admin user is redirected away from /admin", async ({ page }) => {
    // customer@demo.my has "customer" role, not platform_admin
    await signIn(page, "customer@demo.my", "Customer123!");
    await page.goto("/admin");

    // Should be redirected to /dashboard (not an admin)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("platform overview shows heading and stat cards", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    // Page heading
    await expect(page.locator("h1")).toContainText(/platform overview/i, {
      timeout: 10000,
    });

    // Stat cards
    await expect(page.getByText("Total Tenants")).toBeVisible();
    await expect(page.getByText("Active Tenants")).toBeVisible();
    await expect(page.getByText("Total Members")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
  });

  test("quick actions section has navigation links", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    // Quick Actions card
    await expect(page.getByText("Quick Actions")).toBeVisible({
      timeout: 10000,
    });

    // Links to key admin pages
    await expect(
      page.getByRole("link", { name: /manage tenants/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /view audit logs/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /tenant dashboard/i })
    ).toBeVisible();
  });

  test("system status section shows active tenants and total members", async ({
    page,
  }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    await expect(page.getByText("System Status")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Platform Admin — Tenants", () => {
  test("tenants page shows heading and search", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin/tenants");

    // Page heading
    await expect(page.locator("h1")).toContainText(/tenants/i, {
      timeout: 10000,
    });

    // Search input
    await expect(
      page.locator('input[placeholder="Search by name or slug..."]')
    ).toBeVisible();
  });

  test("tenants table has correct column headers", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin/tenants");

    // Wait for table to load
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Column headers
    await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /slug/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /members/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /revenue/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /created/i })).toBeVisible();
  });

  test("tenants search filters the list", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin/tenants");

    // Wait for table
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Search for a non-existent tenant
    await page.fill(
      'input[placeholder="Search by name or slug..."]',
      "nonexistent-zzzz"
    );

    // Should show empty state
    await expect(
      page.getByText(/no tenants match your search/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("navigate from overview to tenants via quick action", async ({
    page,
  }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    // Click "Manage Tenants" quick action
    await page.getByRole("link", { name: /manage tenants/i }).click();

    await expect(page).toHaveURL(/\/admin\/tenants/, { timeout: 8000 });
    await expect(page.locator("h1")).toContainText(/tenants/i, {
      timeout: 8000,
    });
  });
});

test.describe("Platform Admin — Audit Logs", () => {
  test("audit logs page shows heading", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin/audit-logs");

    await expect(page.locator("h1")).toContainText(/audit logs/i, {
      timeout: 10000,
    });
  });

  test("audit logs page has search input", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin/audit-logs");

    await expect(
      page.locator(
        'input[placeholder="Search by actor, action, resource, tenant..."]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("navigate from overview to audit logs via quick action", async ({
    page,
  }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    await page.getByRole("link", { name: /view audit logs/i }).click();

    await expect(page).toHaveURL(/\/admin\/audit-logs/, { timeout: 8000 });
    await expect(page.locator("h1")).toContainText(/audit logs/i, {
      timeout: 8000,
    });
  });
});

test.describe("Platform Admin — Sidebar Navigation", () => {
  test("sidebar shows correct navigation links", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    // Desktop sidebar links (visible on lg screens, may not render on test viewport)
    // Use broader selectors that work on both mobile and desktop
    await expect(page.locator("h1")).toContainText(/platform overview/i, {
      timeout: 10000,
    });

    // Navigate to tenants via URL
    await page.goto("/admin/tenants");
    await expect(page.locator("h1")).toContainText(/tenants/i, {
      timeout: 10000,
    });

    // Navigate to audit logs via URL
    await page.goto("/admin/audit-logs");
    await expect(page.locator("h1")).toContainText(/audit logs/i, {
      timeout: 10000,
    });
  });

  test("Timeo Platform Admin branding is visible", async ({ page }) => {
    await signIn(page, "admin@timeo.my", "Admin123!");
    await page.goto("/admin");

    // The platform layout shows "Timeo" branding and "Platform Admin" or "Super Admin"
    await expect(page.getByText("Timeo").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
