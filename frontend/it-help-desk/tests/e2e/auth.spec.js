/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// E2E test: authentication flow.
// Verifies the full login → dashboard → logout cycle works end-to-end.
import { test, expect } from "@playwright/test";

// The backend must be running on localhost:5000 with a seeded DB.
// Seed it first:  cd Backend && npm run seed
// (Accounts come from seedUsers.js — see the backend README.)
const ADMIN_EMAIL = "admin@jameel-it.com";
const ADMIN_PASSWORD = "password123";

// The app defaults to ARABIC; every text assertion below is English.
// Switch to EN via the login-page language toggle before interacting.
// FIX(e2e): the Login page is a lazy chunk — isVisible() runs immediately
// after goto() and returned false before React mounted, so the click was
// silently skipped and every test failed on dir="rtl". WAIT for the
// toggle instead of probing it.
async function switchToEnglish(page) {
  await page.goto("/login");
  const en = page.locator('button:has-text("EN")').first();
  await en.waitFor({ state: "visible", timeout: 10_000 });
  await en.click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
}

test.describe("Authentication flow", () => {
  test("admin can login, see dashboard, and logout", async ({ page }) => {
    // ---- Login (in English so the assertions below are stable) ----
    await switchToEnglish(page);
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
    // Sidebar shows admin-only links. NOTE: user management is
    // DELIBERATELY not a sidebar item (reference nav has 7 items; /users is
    // reached via the ⌘K palette) — so assert what the app actually renders.
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/reports"]')).toBeVisible();

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
    await switchToEnglish(page);
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
    // Login as a regular user (ahmed.hassan@example.com — from seedUsers.js)
    await switchToEnglish(page);
    await page.fill('input[type="email"]', "ahmed.hassan@example.com");
    await page.fill('input[type="password"]', "Demo@1234");
    await page.click('button[type="submit"]');

    // Regular users land on their home page (role-aware routing)
    await page.waitForURL("**/home", { timeout: 10000 });

    // Sidebar should NOT have admin-only links
    await expect(page.locator('a[href="/dashboard"]')).toHaveCount(0);
    await expect(page.locator('a[href="/reports"]')).toHaveCount(0);

    // Try to access /dashboard directly — the route doesn't exist for
    // non-admins, and the catch-all redirects to the role-aware landing (/home)
    await page.goto("/dashboard");
    await page.waitForURL("**/home", { timeout: 10000 });
    await expect(page).toHaveURL(/\/home$/);
  });
});
