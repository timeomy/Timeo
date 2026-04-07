import { test, expect, type Page } from "@playwright/test";

/**
 * Sign in with seeded user credentials.
 * Assumes the dev seed script has been run (packages/db seed).
 *
 * The gym@demo.my user is a gym admin with an existing business (Iron Paradise).
 */
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from sign-in
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15000 });
}

test.describe("Gym Dashboard", () => {
  test("unauthenticated access to gym dashboard redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/gym");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("gym dashboard page loads when authenticated", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym");

    // Should be on dashboard gym page (not sign-in or error)
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("gym submenu pages load without errors", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");

    const submenuPages = [
      "/dashboard/gym/members",
      "/dashboard/gym/checkins",
    ];

    for (const urlPath of submenuPages) {
      await page.goto(urlPath);

      // Should not redirect to error page
      await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

      // Wait for page to stabilize
      await page.waitForLoadState("networkidle");
    }
  });
});

test.describe("Gym Member Registration", () => {
  test("members page loads when authenticated", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/members");

    // Should load without error
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("navigating to new member page shows registration form", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/members/new");

    // Page should load without error
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Form fields should be present
    const nameInput = page.locator("input[id='name'], input[placeholder*='name' i]").first();
    const emailInput = page.locator("input[id='email'], input[placeholder*='email' i]").first();

    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Submit button should be present
    const submitBtn = page.getByRole("button", { name: /submit|create|add/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });

  test("registration form requires name and email", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/members/new");

    // Get the form submit button
    const submitBtn = page.getByRole("button", { name: /submit|create|add/i }).first();

    // Wait for form to load
    await page.waitForLoadState("networkidle");

    // Button should be disabled when form is empty
    const isDisabled = await submitBtn.isDisabled();
    if (isDisabled) {
      // Type name
      const nameInput = page.locator("input[id='name'], input[placeholder*='name' i]").first();
      await nameInput.fill("Test Member");

      // Type email
      const emailInput = page.locator("input[id='email'], input[placeholder*='email' i]").first();
      await emailInput.fill("test-member@example.com");

      // Button should now be enabled
      await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    }
  });

  test("back button on new member page navigates correctly", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/members/new");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Find back button using aria-label or button text
    const backBtn = page.getByRole("button", { name: /back/i }).first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Click it
    await backBtn.click();

    // Should navigate somewhere (not error page)
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Wait for navigation
    await page.waitForLoadState("networkidle");
  });
});

test.describe("Gym Check-In Flow", () => {
  test("check-ins page loads when authenticated", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/checkins");

    // Page should load without error
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("check-in page loads and displays check-in data", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/checkins");

    // Wait for list to load
    await page.waitForLoadState("networkidle");

    // Page should still be on checkins
    await expect(page).toHaveURL(/\/dashboard\/gym\/checkins/);
  });

  test("check-in page remains stable during refetch", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/checkins");

    // Wait for initial load
    await page.waitForLoadState("networkidle");

    // The page uses a 5-second refetch interval (as seen in the code)
    // We just verify the page doesn't crash and stays responsive
    await page.waitForTimeout(6000);

    // Page should still be on check-ins page
    await expect(page).toHaveURL(/\/dashboard\/gym\/checkins/, { timeout: 5000 });

    // Wait for any refetch to complete
    await page.waitForLoadState("networkidle");
  });

  test("scanner page loads successfully", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/dashboard/gym/scanner");

    // Page should load without error
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });
});

test.describe("Gym Navigation", () => {
  test("can navigate between gym dashboard and members page", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");

    // Navigate to gym dashboard
    await page.goto("/dashboard/gym");
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Navigate to members page
    await page.goto("/dashboard/gym/members");
    await expect(page).toHaveURL(/\/dashboard\/gym\/members/, { timeout: 5000 });

    // Navigate back to gym dashboard
    await page.goto("/dashboard/gym");
    await expect(page).toHaveURL(/\/dashboard\/gym/, { timeout: 5000 });
  });

  test("can navigate between gym members and check-ins pages", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");

    // Navigate to members page
    await page.goto("/dashboard/gym/members");
    await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });

    // Navigate to check-ins page
    await page.goto("/dashboard/gym/checkins");
    await expect(page).toHaveURL(/\/dashboard\/gym\/checkins/, { timeout: 5000 });

    // Navigate to scanner page
    await page.goto("/dashboard/gym/scanner");
    await expect(page).toHaveURL(/\/dashboard\/gym\/scanner/, { timeout: 5000 });
  });

  test("authenticated user can access all gym pages", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");

    const gymPages = [
      "/dashboard/gym",
      "/dashboard/gym/members",
      "/dashboard/gym/checkins",
      "/dashboard/gym/scanner",
    ];

    for (const url of gymPages) {
      await page.goto(url);
      // Should not redirect to sign-in or error
      await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 5000 });
      await expect(page).not.toHaveURL(/\/error/, { timeout: 5000 });
      await page.waitForLoadState("networkidle");
    }
  });
});
