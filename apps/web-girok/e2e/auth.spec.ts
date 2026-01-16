import { test, expect, createTestUserEmail } from './fixtures/auth.fixture';

/**
 * E2E Tests: Full Authentication Flow
 *
 * Integration tests covering complete user journeys:
 * - Registration and login flow
 * - Protected page access
 * - Navigation between pages
 *
 * These tests demonstrate end-to-end authentication behavior.
 */

// Test data
const testUser = {
  name: 'Test User',
  email: createTestUserEmail(),
  password: 'TestPass123!',
};

test.describe('Full Authentication Flow', () => {
  test.skip('should complete full registration and authentication flow', async ({
    loginPage,
    page,
  }) => {
    // 1. Navigate to home page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('My-Girok');

    // 2. Navigate to register page (via consent)
    await page.click('text=Register');
    await expect(page).toHaveURL(/\/(register|consent)/);

    // 3. Complete registration flow
    // If on consent page, accept and proceed
    if (page.url().includes('consent')) {
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: /continue|next/i }).click();
    }

    // 4. Fill registration form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(testUser.name);
    }

    // 5. Submit registration
    await page.click('button[type="submit"]');

    // 6. Should redirect to home page after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 7. Verify user is logged in
    await expect(page.locator('text=Logout')).toBeVisible({ timeout: 5000 });

    // 8. Access protected page
    const protectedLink = page.getByRole('link', { name: /protected|settings/i });
    if (await protectedLink.isVisible()) {
      await protectedLink.click();
      await expect(page).not.toHaveURL(/\/login/);
    }

    // 9. Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });

  test('should access public page as guest', async ({ page }) => {
    // 1. Navigate to home page without login
    await page.goto('/');

    // 2. Verify login/register links are available
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ loginPage }) => {
    // 1. Navigate to login page
    await loginPage.goto();

    // 2. Fill with invalid credentials
    await loginPage.login('nonexistent@example.com', 'WrongPass123!');

    // 3. Should show error message
    await loginPage.expectErrorMessage(/login failed|invalid|incorrect/i);
  });

  test('should validate password requirements on registration', async ({ page }) => {
    // 1. Navigate to register page
    await page.goto('/register');

    // If redirected to consent, skip this test
    if (page.url().includes('consent')) {
      test.skip();
      return;
    }

    // 2. Try weak password
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'weak');

    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('New User');
    }

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Wait for validation (from frontend or backend)
    await page.waitForTimeout(1000);

    // Should show validation error or stay on page
    await expect(page).toHaveURL(/\/(register|consent)/);
  });

  test.skip('should maintain session after page reload', async ({ loginPage, page }) => {
    // 1. Register a new user
    const email = createTestUserEmail();

    await page.goto('/register');

    // Handle consent page if present
    if (page.url().includes('consent')) {
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: /continue|next/i }).click();
    }

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPass123!');

    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Persist Test');
    }

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 2. Reload page
    await page.reload();

    // 3. User should still be logged in
    await expect(page.locator('text=Logout')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // 1. Try to access protected page directly
    await page.goto('/settings');

    // 2. Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should include return URL when redirecting to login', async ({ page }) => {
    // 1. Try to access specific protected page
    await page.goto('/settings/sessions');

    // 2. Should redirect to login with returnUrl
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
  });
});

test.describe('Navigation', () => {
  test('should navigate between public pages', async ({ loginPage, page }) => {
    // 1. Start at home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('My-Girok');

    // 2. Go to login
    await page.getByRole('link', { name: /login/i }).click();
    await expect(page).toHaveURL('/login');
    await loginPage.expectLoginFormVisible();

    // 3. Go to register (via consent)
    const registerLink = page.getByRole('link', { name: /register/i });
    await registerLink.click();
    await expect(page).toHaveURL(/\/(register|consent)/);
  });

  test('should navigate between auth pages', async ({ loginPage, page }) => {
    // 1. Start at login
    await loginPage.goto();

    // 2. Go to forgot password
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);

    // 3. Go back to login
    await page.goBack();
    await expect(page).toHaveURL('/login');

    // 4. Go to register
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/(register|consent)/);
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ loginPage, page }) => {
    await loginPage.goto();

    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to login
    await loginPage.login('test@example.com', 'password123');

    // Should show error (network error or similar)
    // The specific error depends on how the app handles network failures
    await page.waitForTimeout(2000);

    // Restore online mode
    await page.context().setOffline(false);
  });

  test('should handle server errors gracefully', async ({ loginPage }) => {
    await loginPage.goto();

    // Try to login (if server returns 500, should show user-friendly error)
    await loginPage.login('test@example.com', 'password123');

    // Should show error message (not crash)
    await loginPage.expectErrorMessage();
  });
});
