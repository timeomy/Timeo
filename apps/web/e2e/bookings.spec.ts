import { test, expect, type Page } from "@playwright/test";

/**
 * Sign in with seeded user credentials.
 * Assumes the dev seed script has been run (packages/db seed).
 */
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from sign-in
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15000 });
}

test.describe("Dashboard Services", () => {
  test("unauthenticated access to /dashboard/services redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/services");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("services page shows heading and Add Service button", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/services");

    // Page heading
    await expect(page.locator("h1")).toContainText(/services/i, {
      timeout: 10000,
    });

    // Add Service button
    const addBtn = page.getByRole("button", { name: /add service/i });
    await expect(addBtn).toBeVisible();
  });

  test("Add Service dialog opens with correct form fields", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/services");

    // Click Add Service
    await page.getByRole("button", { name: /add service/i }).click();

    // Dialog should open with "Add Service" title
    await expect(page.getByText("Add Service").first()).toBeVisible({
      timeout: 5000,
    });

    // Form fields should be present
    await expect(
      page.locator('input[placeholder="e.g., Hair Cut, Massage"]')
    ).toBeVisible();
    await expect(
      page.locator('textarea[placeholder="Describe the service..."]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="e.g., 30"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="0.00"]')
    ).toBeVisible();

    // Create button should be disabled (empty form)
    const createBtn = page.getByRole("button", {
      name: /create service/i,
    });
    await expect(createBtn).toBeDisabled();

    // Cancel button should be visible
    await expect(
      page.getByRole("button", { name: /cancel/i })
    ).toBeVisible();
  });

  test("Add Service dialog Cancel closes the dialog", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/services");

    await page.getByRole("button", { name: /add service/i }).click();
    await expect(page.getByText("Add Service").first()).toBeVisible({
      timeout: 5000,
    });

    // Click Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Dialog should be closed — the "Create Service" button should no longer be visible
    await expect(
      page.getByRole("button", { name: /create service/i })
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("filling Add Service form enables Create button", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/services");

    await page.getByRole("button", { name: /add service/i }).click();

    // Fill all required fields
    await page.fill(
      'input[placeholder="e.g., Hair Cut, Massage"]',
      "Test Service"
    );
    await page.fill('input[placeholder="e.g., 30"]', "60");
    await page.fill('input[placeholder="0.00"]', "50");

    // Create button should be enabled
    const createBtn = page.getByRole("button", {
      name: /create service/i,
    });
    await expect(createBtn).toBeEnabled();
  });
});

test.describe("Dashboard Bookings", () => {
  test("unauthenticated access to /dashboard/bookings redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/bookings");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("bookings page shows heading and filter tabs", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/bookings");

    // Page heading
    await expect(page.locator("h1")).toContainText(/bookings/i, {
      timeout: 10000,
    });

    // Status filter tabs
    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /pending/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /confirmed/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /completed/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /cancelled/i })
    ).toBeVisible();
  });

  test("bookings tab switching updates active tab", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/bookings");

    // Default tab is "All"
    const allTab = page.getByRole("tab", { name: /all/i });
    await expect(allTab).toHaveAttribute("data-state", "active", {
      timeout: 10000,
    });

    // Click "Pending" tab
    await page.getByRole("tab", { name: /pending/i }).click();
    await expect(
      page.getByRole("tab", { name: /pending/i })
    ).toHaveAttribute("data-state", "active");

    // Click "Confirmed" tab
    await page.getByRole("tab", { name: /confirmed/i }).click();
    await expect(
      page.getByRole("tab", { name: /confirmed/i })
    ).toHaveAttribute("data-state", "active");
  });

  test("pending count badge is visible in header", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/bookings");

    // The header shows "X pending" count
    await expect(page.getByText(/pending/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Store Bookings (Customer View)", () => {
  test("unauthenticated user sees sign-in prompt on /bookings", async ({
    page,
  }) => {
    await page.goto("/bookings");

    // Should show sign-in prompt
    await expect(
      page.getByText(/sign in to view bookings/i)
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("store services page shows heading", async ({ page }) => {
    await page.goto("/services");

    // Page heading
    await expect(page.locator("h1")).toContainText(/services/i, {
      timeout: 8000,
    });
    await expect(
      page.getByText(/browse available services/i)
    ).toBeVisible();
  });

  test("store services page has search input", async ({ page }) => {
    await page.goto("/services");

    await expect(
      page.locator('input[placeholder="Search services..."]')
    ).toBeVisible({ timeout: 8000 });
  });
});
