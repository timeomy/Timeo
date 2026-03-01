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

test.describe("Onboarding Flow", () => {
  test("unauthenticated user is redirected to sign-in", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("post-login page redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/post-login");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("step 1 shows welcome screen with Get Started button", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/onboarding");

    // Step 1: Welcome card
    await expect(page.getByText(/welcome/i).first()).toBeVisible({
      timeout: 8000,
    });
    const getStartedBtn = page.getByRole("button", {
      name: /get started/i,
    });
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toBeEnabled();
  });

  test("clicking Get Started advances to step 2 business form", async ({
    page,
  }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/onboarding");

    await page.getByRole("button", { name: /get started/i }).click();

    // Step 2: Create Business form
    await expect(page.getByText(/create your business/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('input[placeholder="e.g. Bella Hair Studio"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="bella-hair-studio"]')
    ).toBeVisible();

    // Create button disabled when name is empty
    const createBtn = page.getByRole("button", {
      name: /create business/i,
    });
    await expect(createBtn).toBeDisabled();
  });

  test("business name auto-generates URL slug", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /get started/i }).click();

    // Type a business name
    await page.fill(
      'input[placeholder="e.g. Bella Hair Studio"]',
      "My Test Business"
    );

    // Slug field should auto-populate
    const slugInput = page.locator('input[placeholder="bella-hair-studio"]');
    await expect(slugInput).toHaveValue("my-test-business");

    // Create button should now be enabled
    const createBtn = page.getByRole("button", {
      name: /create business/i,
    });
    await expect(createBtn).toBeEnabled();
  });

  test("Back button returns to step 1 welcome", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /get started/i }).click();

    // Verify step 2
    await expect(page.getByText(/create your business/i)).toBeVisible({
      timeout: 5000,
    });

    // Click Back
    await page.getByRole("button", { name: /back/i }).click();

    // Should return to step 1
    await expect(page.getByText(/welcome/i).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: /get started/i })
    ).toBeVisible();
  });

  test("step indicators show correct progress", async ({ page }) => {
    await signIn(page, "gym@demo.my", "GymAdmin123!");
    await page.goto("/onboarding");

    // There should be 3 step indicators
    await expect(page.locator(".rounded-full.transition-all")).toHaveCount(3, {
      timeout: 8000,
    });
  });
});
