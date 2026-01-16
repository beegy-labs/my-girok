import { test, expect, TEST_USER, performLogin } from './fixtures/auth.fixture';

/**
 * E2E Tests: Session Management
 *
 * Tests for session handling including:
 * - Viewing current session info
 * - Revoking other sessions
 * - Session persistence
 *
 * Note: Most session tests require an authenticated user.
 * Tests marked with .skip require backend integration.
 */
test.describe('Session Management', () => {
  test.describe('Sessions Page Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/settings/sessions');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should preserve sessions URL as return URL', async ({ page }) => {
      await page.goto('/settings/sessions');

      // Should redirect to login with returnUrl
      await expect(page).toHaveURL(/\/login\?returnUrl=.*sessions/);
    });
  });

  test.describe('Current Session Display', () => {
    test.skip('should display current session information', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Should display the page
      await sessionsPage.expectPageVisible();

      // Should show current session info
      await sessionsPage.expectCurrentSessionInfo();
    });

    test.skip('should show browser and device info', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Should display browser info (Chrome for Playwright)
      await expect(page.getByText(/chrome/i)).toBeVisible();

      // Should show device type
      await expect(page.getByText(/desktop|mobile/i)).toBeVisible();

      // Should show active status
      await expect(page.getByText(/active/i)).toBeVisible();
    });
  });

  test.describe('Revoke All Sessions', () => {
    test.skip('should show revoke all sessions button', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Should display revoke button
      await expect(sessionsPage.revokeAllButton).toBeVisible();
    });

    test.skip('should revoke all other sessions successfully', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Click revoke all
      await sessionsPage.revokeAllSessions();

      // Should show success message
      await sessionsPage.expectSuccessMessage(/successfully.*revoked/i);
    });

    test.skip('should handle revoke error gracefully', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Mock API error (this would require API mocking)
      // For now, we just verify the error display works

      // If revoke fails, should show error message
      // await sessionsPage.expectErrorMessage(/failed/i);
    });

    test.skip('should not revoke current session', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Revoke all other sessions
      await sessionsPage.revokeAllSessions();
      await sessionsPage.expectSuccessMessage();

      // Should still be logged in
      await expect(page.getByText(/logout|sign out/i)).toBeVisible();

      // Should still be able to access protected routes
      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');
    });
  });

  test.describe('Navigation', () => {
    test.skip('should navigate back to settings', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Click back to settings
      await sessionsPage.goBackToSettings();

      // Should be on settings page
      await expect(page).toHaveURL('/settings');
    });

    test.skip('should access sessions from settings menu', async ({ page }) => {
      // Login first
      await performLogin(page);

      // Go to settings
      await page.goto('/settings');

      // Click on sessions link
      await page.getByRole('link', { name: /sessions/i }).click();

      // Should be on sessions page
      await expect(page).toHaveURL('/settings/sessions');
    });
  });

  test.describe('Security Tips', () => {
    test.skip('should display security tips', async ({ sessionsPage, page }) => {
      // Login first
      await performLogin(page);

      // Navigate to sessions page
      await sessionsPage.goto();

      // Should show security tips section
      await expect(page.getByText(/security tips/i)).toBeVisible();

      // Should show helpful tips
      await expect(page.getByText(/sign out.*devices.*no longer use/i)).toBeVisible();
      await expect(page.getByText(/unfamiliar sessions.*change.*password/i)).toBeVisible();
      await expect(page.getByText(/two-factor authentication/i)).toBeVisible();
    });
  });
});

test.describe('Session Persistence', () => {
  test.skip('should maintain session across page reloads', async ({ loginPage, page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL('/');

    // Reload multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await expect(page.getByText(/logout|sign out/i)).toBeVisible();
    }
  });

  test.skip('should maintain session across navigation', async ({ loginPage, page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    // Navigate to different pages
    const pages = ['/settings', '/settings/sessions', '/'];
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page.getByText(/logout|sign out/i)).toBeVisible();
    }
  });
});

test.describe('Token Refresh', () => {
  // These tests verify that session tokens are refreshed properly
  // They require longer timeouts and backend configuration

  test.skip('should refresh token before expiry', async ({ loginPage, page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL('/');

    // Wait for some time (token should be refreshed automatically)
    await page.waitForTimeout(5000);

    // Should still be logged in
    await expect(page.getByText(/logout|sign out/i)).toBeVisible();

    // Should be able to access protected route
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
  });

  test.skip('should handle token refresh failure gracefully', async () => {
    // This test would require mocking the token refresh endpoint to fail
    // If token refresh fails, user should be redirected to login
    // with their intended destination preserved
  });

  test.skip('should not lose session during API calls', async ({ loginPage, page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    // Make multiple API calls by navigating
    await page.goto('/settings');
    await page.goto('/settings/sessions');
    await page.goto('/');

    // Should still be logged in
    await expect(page.getByText(/logout|sign out/i)).toBeVisible();
  });
});

test.describe('Session Security', () => {
  test.skip('should logout on session invalidation', async ({ loginPage, page, context }) => {
    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL('/');

    // Clear session cookie (simulating session invalidation)
    await context.clearCookies();

    // Navigate to protected route
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('should not allow access with expired session', async ({ page }) => {
    // This test would require manipulating session expiry
    // or waiting for actual session timeout

    // With expired session, should redirect to login
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('should handle concurrent sessions correctly', async ({ browser }) => {
    // Create two browser contexts (simulating two devices)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login on both
    await page1.goto('/login');
    await page1.getByLabel(/email/i).fill(TEST_USER.email);
    await page1.getByLabel(/password/i).fill(TEST_USER.password);
    await page1.getByRole('button', { name: /login/i }).click();

    await page2.goto('/login');
    await page2.getByLabel(/email/i).fill(TEST_USER.email);
    await page2.getByLabel(/password/i).fill(TEST_USER.password);
    await page2.getByRole('button', { name: /login/i }).click();

    // Both should be logged in
    await expect(page1).toHaveURL('/');
    await expect(page2).toHaveURL('/');

    // Revoke all sessions from page1
    await page1.goto('/settings/sessions');
    await page1.getByRole('button', { name: /revoke|sign out.*other/i }).click();

    // Page1 should still work
    await page1.reload();
    await expect(page1.getByText(/logout/i)).toBeVisible();

    // Page2 should be logged out on next request
    await page2.reload();
    await expect(page2).toHaveURL(/\/login/);

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
