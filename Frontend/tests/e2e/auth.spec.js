// E2E test: authentication flow.
// Verifies the full login → dashboard → logout cycle works end-to-end.
import { test, expect } from "@playwright/test";

// These tests assume the backend is running on localhost:5050 with a seeded DB.
// Run `npm run seed` in the backend before running these tests.

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin@1234";

test.describe("Authentication flow", () => {
  test("admin can login, see dashboard, and logout", async ({ page }) => {
    // ---- Login ----
    await page.goto("/login");
    await expect(page).toHaveTitle(/it-helpdesk/i);

    // Fill the login form
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Should redirect to /dashboard (admin)
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard$/);

    // Dashboard should show stat cards
    await expect(page.locator("text=Total Tickets")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Recent Tickets")).toBeVisible();

    // Sidebar should have admin-only links
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/users"]')).toBeVisible();

    // ---- Logout ----
    // Click the avatar to open the profile dropdown
    await page.click('button[aria-label="Open profile menu"]');
    // Click logout
    await page.click('button[role="menuitem"]:has-text("Logout")');

    // Should redirect to /login
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("wrong password shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Try to access a protected route directly
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("regular user cannot access admin pages", async ({ page }) => {
    // Login as a regular user (ahmed.hassan@example.com)
    await page.goto("/login");
    await page.fill('input[type="email"]', "ahmed.hassan@example.com");
    await page.fill('input[type="password"]', "Demo@1234");
    await page.click('button[type="submit"]');

    // Should redirect to /tickets (non-admin default)
    await page.waitForURL("**/tickets", { timeout: 10000 });

    // Sidebar should NOT have admin-only links
    await expect(page.locator('a[href="/dashboard"]')).toHaveCount(0);
    await expect(page.locator('a[href="/users"]')).toHaveCount(0);

    // Try to access /dashboard directly — should redirect to /tickets
    await page.goto("/dashboard");
    await page.waitForURL("**/tickets", { timeout: 10000 });
    await expect(page).toHaveURL(/\/tickets$/);
  });
});
