/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// E2E test: ticket creation flow.
// Verifies a user can fill the create ticket form, submit, and see the new ticket in the list.
// The app defaults to ARABIC — switch to EN on the login page first so the
// English text assertions below are stable.
import { test, expect } from "@playwright/test";

// Backend must run on localhost:5000, seeded via `npm run seed` (Backend).
const ADMIN_EMAIL = "admin@jameel-it.com";
const ADMIN_PASSWORD = "password123";

test.describe("Ticket creation", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test (in English for stable assertions)
    await page.goto("/login");
    // FIX(e2e): wait for the lazy-loaded toggle instead of probing (isVisible
    // ran before React mounted and silently skipped the click).
    const en = page.locator('button:has-text("EN")').first();
    await en.waitFor({ state: "visible", timeout: 10_000 });
    await en.click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("admin can create a new ticket", async ({ page }) => {
    // Navigate to New Ticket page
    await page.click('a[href="/tickets"]');
    await page.waitForURL("**/tickets", { timeout: 5000 });

    // Fill the form
    await page.selectOption('select[name="product"]', "E-Invoice");
    await page.selectOption('select[name="company"]', "Burger King");
    await page.selectOption('select[name="category"]', "software");

    // Click "High" priority button
    await page.click('button[role="button"]:has-text("High"), button:has-text("High")');

    // Fill description
    await page.fill("textarea", "E2E test ticket — cannot generate invoice PDF");

    // Submit
    await page.click('button[type="submit"]');

    // Wait for the form to reset (success indicator)
    await page.waitForTimeout(3000);

    // Navigate to Tickets List
    await page.click('a[href="/ticketslist"]');
    await page.waitForURL("**/ticketslist", { timeout: 5000 });

    // The new ticket should appear in the TABLE. Scope assertions to the
    // table body — page-wide text= matchers hit the hidden <option> elements
    // of the filter dropdowns first ("Burger King" is also a filter option)
    // and toBeVisible() fails on the hidden option.
    const rows = page.locator("table tbody");
    await expect(rows.filter({ hasText: "E-Invoice" }).first()).toBeVisible({ timeout: 10000 });
    await expect(rows.filter({ hasText: "Burger King" }).first()).toBeVisible();
    await expect(rows.filter({ hasText: "Software" }).first()).toBeVisible();
  });

  test("ticket list shows correct columns", async ({ page }) => {
    await page.goto("/ticketslist");
    await page.waitForLoadState("networkidle");

    // Check table headers
    await expect(page.locator("th:has-text('Ticket #')")).toBeVisible();
    await expect(page.locator("th:has-text('Created By')")).toBeVisible();
    await expect(page.locator("th:has-text('Priority')")).toBeVisible();
    await expect(page.locator("th:has-text('Status')")).toBeVisible();
    await expect(page.locator("th:has-text('SLA')")).toBeVisible();
  });

  test("filters work on ticket list", async ({ page }) => {
    await page.goto("/ticketslist");
    await page.waitForLoadState("networkidle");

    // Select a status filter
    await page.selectOption('select[aria-label="Filter by status"]', "open");

    // Wait for the filtered list to load
    await page.waitForTimeout(1000);

    // The table should still be visible (no crash)
    await expect(page.locator("table")).toBeVisible();
  });

  test("ticket detail PAGE opens with a shareable URL and tabs", async ({ page }) => {
    await page.goto("/ticketslist");
    await page.waitForLoadState("networkidle");

    // Click the first ticket row → navigates to /tickets/:id (a real page now)
    const firstRow = page.locator("table tbody tr[tabindex=\"0\"]").first();
    await firstRow.click();
    await page.waitForURL("**/tickets/*", { timeout: 5000 });

    // The page shows the activity tabs (description is always visible)
    await expect(page.locator('[role="tab"]:has-text("Comments")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("History")')).toBeVisible();

    // Status stepper shows the workflow
    await expect(page.locator(".stepper")).toBeVisible();

    // Back button returns to the list
    await page.goBack();
    await page.waitForURL("**/ticketslist", { timeout: 5000 });
  });

  test("command palette opens with Ctrl+K and finds actions", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the lazy-loaded page to mount BEFORE pressing the shortcut —
    // the global keydown listener attaches with the Dashboard shell, and
    // pressing immediately after goto() races it (palette never opened).
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10_000 });

    // Open the palette via keyboard
    await page.keyboard.press("Control+k");
    await expect(page.locator(".palette")).toBeVisible({ timeout: 5000 });

    // Type to filter actions
    await page.keyboard.type("new ticket");
    await expect(page.locator(".palette-item").first()).toBeVisible();

    // Escape closes it
    await page.keyboard.press("Escape");
    await expect(page.locator(".palette")).toHaveCount(0);
  });
});
