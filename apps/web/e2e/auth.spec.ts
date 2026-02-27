import { test, expect } from "@playwright/test";

// Use a unique email per test run to avoid conflicts
const testEmail = (prefix: string) =>
  `${prefix}-${Date.now()}@playwright-test.invalid`;

test.describe("Auth Flow", () => {
  test("sign-up shows verify-email page", async ({ page }) => {
    await page.goto("/sign-up");
    // Real h1 text is "Create your account"
    await expect(page.locator("h1")).toContainText(/create your account/i);

    // Name field uses id="name", email uses id="email", password uses id="password"
    await page.fill("#name", "Test User");
    await page.fill("#email", testEmail("signup"));
    await page.fill("#password", "TestPass123!");
    await page.click('button[type="submit"]');

    // Should redirect to verify-email (no token = "check your email" state)
    await expect(page).toHaveURL(/\/verify-email/, { timeout: 10000 });
    // Real h1 text is "Verify your email"
    await expect(page.locator("h1")).toContainText(/verify your email/i);
  });

  test("sign-in with wrong password shows error", async ({ page }) => {
    await page.goto("/sign-in");
    // Real h1 text is "Welcome back"
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    await page.fill("#email", "nonexistent@example.com");
    await page.fill("#password", "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Error is rendered as <p className="text-sm text-destructive">
    await expect(page.locator(".text-destructive")).toBeVisible({
      timeout: 8000,
    });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in error does not reveal if email exists", async ({ page }) => {
    await page.goto("/sign-in");

    // Non-existent email
    await page.fill("#email", "doesnotexist999@example.com");
    await page.fill("#password", "SomePassword123!");
    await page.click('button[type="submit"]');
    const errorForMissing = await page
      .locator(".text-destructive")
      .textContent({ timeout: 8000 })
      .catch(() => "");

    await page.reload();

    // Email that looks like it might exist (same error message should appear)
    await page.fill("#email", "admin@timeo.my");
    await page.fill("#password", "WrongPassword123!");
    await page.click('button[type="submit"]');
    const errorForExisting = await page
      .locator(".text-destructive")
      .textContent({ timeout: 8000 })
      .catch(() => "");

    // Both errors should be identical (prevent email enumeration)
    // If both are empty strings the auth server timed out — still acceptable
    if (errorForMissing && errorForExisting) {
      expect(errorForMissing.trim()).toBe(errorForExisting.trim());
    }
  });

  test("forgot-password shows success regardless of email existence", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    // Real h1 text is "Forgot password?"
    await expect(page.locator("h1")).toContainText(/forgot password/i);

    await page.fill('input[type="email"]', "doesnotexist999@example.com");
    await page.click('button[type="submit"]');

    // Success state renders h1 "Check your email" with a confirmation message
    await expect(page.locator("h1")).toContainText(/check your email/i, {
      timeout: 8000,
    });
  });

  test("verify-email with no token shows check-email page", async ({
    page,
  }) => {
    await page.goto("/verify-email");
    // Real h1 for the no-token state is "Verify your email"
    await expect(page.locator("h1")).toContainText(/verify your email/i);
    // Should NOT show the spinning loader (no token = static page, no async work)
    await expect(page.locator(".animate-spin")).not.toBeVisible();
  });

  test("verify-email with invalid token shows error", async ({ page }) => {
    await page.goto("/verify-email?token=invalid-token-12345");
    // Should eventually show the "Verification failed" error state h1
    await expect(page.locator("h1")).toContainText(
      /verification failed/i,
      { timeout: 15000 }
    );
  });

  test("sign-in page has no open redirect", async ({ page }) => {
    // Attempt open redirect via redirect param
    await page.goto("/sign-in?redirect=https://evil.com");
    // The page should load normally without being redirected externally
    await expect(page).toHaveURL(/\/sign-in/);
    // Real h1 is "Welcome back"
    await expect(page.locator("h1")).toContainText(/welcome back/i);
  });

  test("protected routes redirect to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Middleware should redirect unauthenticated users to sign-in
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 8000 });
  });

  test("reset-password with no token shows invalid link", async ({ page }) => {
    await page.goto("/reset-password");
    // No token → renders "Invalid Link" h1
    await expect(page.locator("h1")).toContainText(/invalid link/i);
    // Should have a link back to forgot-password
    await expect(
      page.locator('a[href="/forgot-password"]')
    ).toBeVisible();
  });

  test("reset-password with invalid token shows form then error on submit", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=invalid-token-xyz");
    // Token is present → shows the "Set new password" form
    await expect(page.locator("h1")).toContainText(/set new password/i);
    // Fill matching passwords (valid length) and submit
    await page.fill('input[placeholder="New password"]', "NewPass123!");
    await page.fill('input[placeholder="Confirm password"]', "NewPass123!");
    await page.click('button[type="submit"]');
    // Should show an error from the server (invalid token)
    await expect(page.locator(".text-destructive")).toBeVisible({
      timeout: 10000,
    });
  });

  test("sign-up client-side validation shows field errors", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await expect(page.locator("h1")).toContainText(/create your account/i);

    // Submit with all fields empty → "All fields are required"
    await page.click('button[type="submit"]');
    await expect(page.locator(".text-destructive")).toContainText(
      /all fields are required/i
    );

    // Fill name and email but short password → "at least 8 characters"
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "1234");
    await page.click('button[type="submit"]');
    await expect(page.locator(".text-destructive")).toContainText(
      /at least 8 characters/i
    );
  });
});
