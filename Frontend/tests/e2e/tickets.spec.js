// E2E test: ticket creation flow.
// Verifies a user can fill the create ticket form, submit, and see the new ticket in the list.
import { test, expect } from "@playwright/test";

test.describe("Ticket creation", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "Admin@1234");
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

    // The new ticket should appear in the table
    await expect(page.locator("text=E-Invoice").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Burger King").first()).toBeVisible();
    await expect(page.locator("text=Software").first()).toBeVisible();
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

  test("ticket detail modal opens and shows tabs", async ({ page }) => {
    await page.goto("/ticketslist");
    await page.waitForLoadState("networkidle");

    // Click the first ticket row
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // Modal should open with tabs
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="tab"]:has-text("Details")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Comments")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("History")')).toBeVisible();

    // Close the modal with Escape
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
});
