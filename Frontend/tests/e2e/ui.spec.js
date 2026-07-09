// E2E test: UI features — dark mode, navigation, notifications.
import { test, expect } from "@playwright/test";

test.describe("UI features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "Admin@1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("dark mode toggle works", async ({ page }) => {
    // Initial theme should be light
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");

    // Click the dark mode toggle
    await page.click('button[aria-label*="dark mode"]');

    // Theme should switch to dark
    const darkTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(darkTheme).toBe("dark");

    // Toggle back to light
    await page.click('button[aria-label*="light mode"]');
    const lightTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(lightTheme).toBe("light");
  });

  test("sidebar navigation works", async ({ page }) => {
    // Navigate to Tickets List
    await page.click('a[href="/ticketslist"]');
    await page.waitForURL("**/ticketslist");
    expect(page.url()).toContain("/ticketslist");

    // Navigate to Knowledge Base
    await page.click('a[href="/kb"]');
    await page.waitForURL("**/kb");
    expect(page.url()).toContain("/kb");

    // Navigate to Settings
    await page.click('a[href="/settings"]');
    await page.waitForURL("**/settings");
    expect(page.url()).toContain("/settings");

    // Navigate back to Dashboard
    await page.click('a[href="/dashboard"]');
    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("notifications dropdown opens", async ({ page }) => {
    // Click the notifications bell
    await page.click('button[aria-label*="Notifications"]');

    // The dropdown should be visible
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Should have "Mark All as Read" button
    await expect(page.locator('button:has-text("Mark All as Read")')).toBeVisible();
  });

  test("settings page has all tabs", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Three tabs should be visible
    await expect(page.locator('[role="tab"]:has-text("Personal Details")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Job Details")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Password")')).toBeVisible();

    // Notification preferences should be visible
    await expect(page.locator("text=Notification Preferences")).toBeVisible();

    // Click the Password tab
    await page.click('[role="tab"]:has-text("Password")');
    await expect(page.locator('label:has-text("Current Password")')).toBeVisible();
    await expect(page.locator('label:has-text("New Password")')).toBeVisible();
  });

  test("users page is accessible to admin", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Should see the "Add User" button
    await expect(page.locator('button:has-text("Add User")')).toBeVisible();

    // Should see the search box
    await expect(page.locator('input[aria-label="Search users"]')).toBeVisible();

    // Table should have correct headers
    await expect(page.locator("th:has-text('User')")).toBeVisible();
    await expect(page.locator("th:has-text('Role')")).toBeVisible();
    await expect(page.locator("th:has-text('Status')")).toBeVisible();
  });

  test("CSV export button is visible on tickets list", async ({ page }) => {
    await page.goto("/ticketslist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });
});
