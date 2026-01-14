import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Hierarchical Menu Navigation E2E Tests
 */
test.describe('Menu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display sidebar with menu items', async ({ page }) => {
    // Sidebar should be visible
    await expect(page.getByText('Girok Admin')).toBeVisible();

    // Top-level items should be visible
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await expect(page.getByText(/legal/i)).toBeVisible();
  });

  test('should expand and collapse menu groups', async ({ page }) => {
    // Find Legal menu group
    const legalMenu = page.getByRole('button', { name: /legal/i });
    await expect(legalMenu).toBeVisible();

    // Click to expand
    await legalMenu.click();

    // Children should be visible
    await expect(page.getByText(/documents/i)).toBeVisible();
    await expect(page.getByText(/consents/i)).toBeVisible();

    // Click again to collapse
    await legalMenu.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Children should be hidden (collapsed)
    const documentsLink = page.getByRole('link', { name: /documents/i });
    await expect(documentsLink).toBeHidden();
  });

  test('should navigate to nested pages', async ({ page }) => {
    // Expand Legal
    await page.getByRole('button', { name: /legal/i }).click();

    // Click Documents
    await page.getByRole('link', { name: /documents/i }).click();

    await expect(page).toHaveURL('/legal/documents');
  });

  test('should highlight active menu item', async ({ page }) => {
    await page.goto('/legal/documents');

    // Parent should have active styling
    const legalGroup = page.getByRole('button', { name: /legal/i });
    await expect(legalGroup).toHaveClass(/text-theme-primary/);

    // Active link should have distinct styling
    const documentsLink = page.getByRole('link', { name: /documents/i });
    await expect(documentsLink).toHaveClass(/bg-theme-primary/);
  });

  test('should show NEW badge on consent stats', async ({ page }) => {
    // Expand Legal
    await page.getByRole('button', { name: /legal/i }).click();

    // Should see NEW badge
    await expect(page.getByText('new')).toBeVisible();
  });

  test('should persist expanded state across page navigation', async ({ page }) => {
    // Expand Legal
    await page.getByRole('button', { name: /legal/i }).click();
    await expect(page.getByRole('link', { name: /documents/i })).toBeVisible();

    // Navigate to dashboard
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL('/');

    // Legal should still be expanded (state persisted)
    await expect(page.getByRole('link', { name: /documents/i })).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar should be hidden by default
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Click hamburger menu
    await page.getByRole('button', { name: /menu/i }).click();

    // Sidebar should slide in
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Click overlay to close
    await page.locator('.fixed.inset-0.bg-black').click();

    // Sidebar should slide out
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('should filter menu based on permissions', async ({ page }) => {
    // Note: This test assumes different admin roles have different permissions
    // With super_admin, all menu items should be visible
    await expect(page.getByText(/tenants/i)).toBeVisible();
    await expect(page.getByText(/audit/i)).toBeVisible();
    await expect(page.getByText(/legal/i)).toBeVisible();
  });
});
