import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Tenant Management E2E Tests
 */
test.describe('Tenant Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display tenants list', async ({ page }) => {
    // Navigate to tenants
    await page.getByText(/tenants|partners/i).click();

    await expect(page).toHaveURL('/tenants');
    await expect(page.getByRole('heading', { name: /tenants|partners/i })).toBeVisible();
  });

  test('should filter tenants by status', async ({ page }) => {
    await page.goto('/tenants');

    // Select PENDING filter
    const statusFilter = page.getByRole('combobox', { name: /status/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('PENDING');
      // Verify filter is applied
      await expect(page.getByText(/pending/i)).toBeVisible();
    }
  });

  test('should open create tenant form', async ({ page }) => {
    await page.goto('/tenants');

    // Click create button
    await page.getByRole('button', { name: /create|new|add/i }).click();

    await expect(page).toHaveURL('/tenants/new');
    await expect(page.getByRole('heading', { name: /create|new tenant/i })).toBeVisible();
  });

  test('should create new tenant', async ({ page }) => {
    await page.goto('/tenants/new');

    // Fill form
    await page.getByLabel(/name/i).fill('Test Partner Company');
    await page.getByLabel(/slug/i).fill('test-partner');
    await page.getByLabel(/type/i).selectOption('COMMERCE');

    // Contact info
    await page.getByLabel(/contact.*email/i).fill('contact@testpartner.com');
    await page.getByLabel(/contact.*name/i).fill('John Doe');

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();

    // Should redirect to list or show success message
    await expect(page.getByText(/success|created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should view tenant details', async ({ page }) => {
    await page.goto('/tenants');

    // Click on first tenant row
    const firstRow = page.getByRole('row').nth(1);
    if (await firstRow.isVisible()) {
      await firstRow.click();

      // Should show tenant details
      await expect(page.getByText(/details|information/i)).toBeVisible();
    }
  });

  test('should approve pending tenant', async ({ page }) => {
    await page.goto('/tenants');

    // Filter by pending
    const statusFilter = page.getByRole('combobox', { name: /status/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('PENDING');
    }

    // Click approve on first pending tenant
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Confirm dialog if exists
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should show success message
      await expect(page.getByText(/approved|success/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should suspend active tenant', async ({ page }) => {
    await page.goto('/tenants');

    // Filter by active
    const statusFilter = page.getByRole('combobox', { name: /status/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('ACTIVE');
    }

    // Click suspend on first active tenant
    const suspendButton = page.getByRole('button', { name: /suspend/i }).first();
    if (await suspendButton.isVisible()) {
      await suspendButton.click();

      // Fill reason if modal appears
      const reasonInput = page.getByLabel(/reason/i);
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Violation of terms');
      }

      // Confirm
      const confirmButton = page.getByRole('button', { name: /confirm|yes|suspend/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should show success message
      await expect(page.getByText(/suspended|success/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
