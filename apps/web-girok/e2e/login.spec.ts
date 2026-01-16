import {
  test,
  expect,
  TEST_USER,
  INVALID_USER,
  createTestUserEmail,
} from './fixtures/auth.fixture';

/**
 * E2E Tests: Login Flow
 *
 * Tests for email/password authentication including:
 * - Form validation
 * - Successful login
 * - Invalid credentials handling
 * - Remember email functionality
 * - Return URL redirect
 * - Session persistence
 */
test.describe('Login Flow', () => {
  test.describe('Login Form Display', () => {
    test('should display login form with all elements', async ({ loginPage }) => {
      await loginPage.goto();

      await loginPage.expectLoginFormVisible();
      await expect(loginPage.registerLink).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    test('should display OAuth provider buttons', async ({ loginPage }) => {
      await loginPage.goto();

      await loginPage.expectOAuthButtonsVisible();
    });

    test('should show remember email checkbox', async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.rememberEmailCheckbox).toBeVisible();
    });
  });

  test.describe('Login Validation', () => {
    test('should require email field', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('SomePassword123!');
      await loginPage.submit();

      // Form should not submit without email
      await expect(page).toHaveURL(/\/login/);
    });

    test('should require password field', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.fillEmail('test@example.com');
      await loginPage.submit();

      // Form should not submit without password
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show error for invalid credentials', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(INVALID_USER.email, INVALID_USER.password);

      // Wait for error message to appear
      await loginPage.expectErrorMessage(/login failed|invalid|incorrect/i);
    });

    test('should show error for non-existent user', async ({ loginPage }) => {
      await loginPage.goto();
      const randomEmail = `nonexistent-${Date.now()}@example.com`;
      await loginPage.login(randomEmail, 'SomePassword123!');

      await loginPage.expectErrorMessage(/login failed|not found|invalid/i);
    });
  });

  test.describe('Successful Login', () => {
    // Note: This test requires a pre-existing test user in the system
    // In a real E2E environment, this would be seeded in the database
    test.skip('should login successfully with valid credentials', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Should redirect to home page
      await expect(page).toHaveURL('/');

      // Should show logout option indicating logged in state
      await expect(page.getByText(/logout|sign out/i)).toBeVisible();
    });

    test.skip('should redirect to return URL after login', async ({ loginPage, page }) => {
      const returnUrl = '/settings';
      await loginPage.gotoWithReturnUrl(returnUrl);
      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Should redirect to the specified return URL
      await expect(page).toHaveURL(returnUrl);
    });
  });

  test.describe('Remember Email', () => {
    test('should save email when remember checkbox is checked', async ({ loginPage, page }) => {
      await loginPage.goto();

      // Fill email and ensure remember is checked
      await loginPage.fillEmail('remember-test@example.com');

      // Check the remember checkbox if not already checked
      const isChecked = await loginPage.rememberEmailCheckbox.isChecked();
      if (!isChecked) {
        await loginPage.rememberEmailCheckbox.click();
      }

      // Submit (will fail with invalid password, but email should be saved)
      await loginPage.fillPassword('InvalidPass!');
      await loginPage.submit();

      // Navigate away and back
      await page.goto('/');
      await loginPage.goto();

      // Email should be pre-filled
      await expect(loginPage.emailInput).toHaveValue('remember-test@example.com');
    });
  });

  test.describe('Session Persistence', () => {
    test.skip('should maintain session after page reload', async ({ loginPage, page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await expect(page).toHaveURL('/');

      // Reload page
      await page.reload();

      // User should still be logged in
      await expect(page.getByText(/logout|sign out/i)).toBeVisible();
    });

    test.skip('should access protected routes after login', async ({ loginPage, page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await expect(page).toHaveURL('/');

      // Access protected route
      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('Redirect When Unauthenticated', () => {
    test('should redirect to login for protected routes', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/settings');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should preserve intended destination in return URL', async ({ page }) => {
      // Try to access protected route
      await page.goto('/settings/sessions');

      // Should redirect to login with returnUrl
      await expect(page).toHaveURL(/\/login\?returnUrl=/);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to register page', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.registerLink.click();

      await expect(page).toHaveURL(/\/(register|consent)/);
    });

    test('should navigate to forgot password page', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.forgotPasswordLink.click();

      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });
});

test.describe('Logout Flow', () => {
  test.skip('should logout successfully', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL('/');

    // Click logout
    await page.getByText(/logout|sign out/i).click();

    // Should redirect to login or home
    await expect(page).toHaveURL(/^\/(login)?$/);

    // Login button should be visible
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });

  test.skip('should not access protected routes after logout', async ({ loginPage, page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL('/');

    // Logout
    await page.getByText(/logout|sign out/i).click();

    // Try to access protected route
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
