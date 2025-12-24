import { test, expect } from '@playwright/test';

/**
 * Admin Authentication E2E Tests
 */
test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials|unauthorized/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('super_admin@girok.dev');
    await page.getByLabel(/password/i).fill('SuperAdmin123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Girok Admin')).toBeVisible();
  });

  test('should redirect to login for protected routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/legal/documents');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('super_admin@girok.dev');
    await page.getByLabel(/password/i).fill('SuperAdmin123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/');

    // Open user menu and click logout
    await page.getByRole('button', { name: /super/i }).click();
    await page.getByRole('button', { name: /sign out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

/**
 * Helper to login as admin
 */
export async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('super_admin@girok.dev');
  await page.getByLabel(/password/i).fill('SuperAdmin123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}
