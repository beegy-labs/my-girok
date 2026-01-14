import { expect, Page } from '@playwright/test';

/**
 * Helper to login as admin
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('super_admin@girok.dev');
  await page.getByLabel(/password/i).fill('SuperAdmin123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}
