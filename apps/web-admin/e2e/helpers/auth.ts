import { expect, Page } from '@playwright/test';
import { TEST_CONFIG } from '../fixtures/test-config';

/**
 * Helper to login as admin
 *
 * Uses credentials from TEST_CONFIG which are loaded from environment variables:
 * - E2E_TEST_EMAIL: Admin user email (default: super_admin@girok.dev)
 * - E2E_TEST_PASSWORD: Admin user password (default: SuperAdmin123!)
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_CONFIG.admin.email);
  await page.getByLabel(/password/i).fill(TEST_CONFIG.admin.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}

/**
 * Helper to login as MASTER admin
 *
 * MASTER role has full system access including OAuth settings.
 * Uses master credentials from TEST_CONFIG:
 * - E2E_TEST_MASTER_EMAIL: Master admin email (default: master@girok.dev)
 * - E2E_TEST_MASTER_PASSWORD: Master admin password (default: MasterAdmin123!)
 */
export async function loginAsMaster(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_CONFIG.master?.email || TEST_CONFIG.admin.email);
  await page
    .getByLabel(/password/i)
    .fill(TEST_CONFIG.master?.password || TEST_CONFIG.admin.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}
