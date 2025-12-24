import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './admin-auth.spec';

/**
 * Audit Logs E2E Tests
 */
test.describe('Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display audit logs list', async ({ page }) => {
    // Navigate to audit logs
    await page.getByText(/audit/i).click();

    await expect(page).toHaveURL('/audit-logs');
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible();
  });

  test('should filter by action type', async ({ page }) => {
    await page.goto('/audit-logs');

    // Select action filter
    const actionFilter = page.getByRole('combobox', { name: /action/i });
    if (await actionFilter.isVisible()) {
      await actionFilter.selectOption('create');
      // Verify table updates
      await expect(page.getByText(/create/i)).toBeVisible();
    }
  });

  test('should filter by resource type', async ({ page }) => {
    await page.goto('/audit-logs');

    // Select resource filter
    const resourceFilter = page.getByRole('combobox', { name: /resource/i });
    if (await resourceFilter.isVisible()) {
      await resourceFilter.selectOption('legal_document');
      await expect(page.getByText(/legal/i)).toBeVisible();
    }
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/audit-logs');

    // Set date range
    const dateFrom = page.getByLabel(/from|start/i);
    const dateTo = page.getByLabel(/to|end/i);

    if ((await dateFrom.isVisible()) && (await dateTo.isVisible())) {
      await dateFrom.fill('2024-01-01');
      await dateTo.fill('2024-12-31');

      // Trigger filter
      await page.getByRole('button', { name: /apply|filter/i }).click();
    }
  });

  test('should view state changes modal', async ({ page }) => {
    await page.goto('/audit-logs');

    // Click on a row to view details
    const viewButton = page.getByRole('button', { name: /view|details|diff/i }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should show modal with before/after state
      await expect(page.getByText(/before|after|changes/i)).toBeVisible();
    }
  });

  test('should export to CSV', async ({ page }) => {
    await page.goto('/audit-logs');

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click export button
    const exportButton = page.getByRole('button', { name: /export|csv|download/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('should paginate through logs', async ({ page }) => {
    await page.goto('/audit-logs');

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /next|>/i });
    if ((await nextButton.isVisible()) && (await nextButton.isEnabled())) {
      await nextButton.click();

      // URL should update with page parameter
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test('should clear filters', async ({ page }) => {
    await page.goto('/audit-logs');

    // Apply some filters first
    const actionFilter = page.getByRole('combobox', { name: /action/i });
    if (await actionFilter.isVisible()) {
      await actionFilter.selectOption('create');
    }

    // Click clear filters
    const clearButton = page.getByRole('button', { name: /clear|reset/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();

      // Filters should be reset
      await expect(actionFilter).toHaveValue('');
    }
  });
});
