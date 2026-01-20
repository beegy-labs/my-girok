import { test, expect } from './fixtures/auth.fixture';

/**
 * E2E Tests: OAuth Provider Enable/Disable
 *
 * Tests for dynamic OAuth provider loading based on enabled status.
 * Verifies that:
 * - Only enabled providers are shown on login page
 * - Disabled providers are not visible/clickable
 * - Provider list updates dynamically when toggled
 */
test.describe('OAuth Provider Management', () => {
  test.describe('Enabled Providers Display', () => {
    test('should only show enabled OAuth providers on login page', async ({ loginPage, page }) => {
      // Mock enabled providers API (only Google and Kakao enabled)
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [
              { provider: 'GOOGLE', displayName: 'Google' },
              { provider: 'KAKAO', displayName: 'Kakao' },
            ],
          }),
        });
      });

      await loginPage.goto();

      // Enabled providers should be visible
      await expect(loginPage.googleButton).toBeVisible();
      await expect(loginPage.kakaoButton).toBeVisible();

      // Disabled providers should not be visible
      await expect(loginPage.naverButton).not.toBeVisible();
      await expect(loginPage.appleButton).not.toBeVisible();
    });

    test('should show all OAuth providers when all are enabled', async ({ loginPage, page }) => {
      // Mock all providers enabled
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [
              { provider: 'GOOGLE', displayName: 'Google' },
              { provider: 'KAKAO', displayName: 'Kakao' },
              { provider: 'NAVER', displayName: 'Naver' },
              { provider: 'APPLE', displayName: 'Apple' },
            ],
          }),
        });
      });

      await loginPage.goto();

      // All providers should be visible
      await expect(loginPage.googleButton).toBeVisible();
      await expect(loginPage.kakaoButton).toBeVisible();
      await expect(loginPage.naverButton).toBeVisible();
      await expect(loginPage.appleButton).toBeVisible();
    });

    test('should show no OAuth providers when all are disabled', async ({ loginPage, page }) => {
      // Mock no providers enabled
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [],
          }),
        });
      });

      await loginPage.goto();

      // No OAuth providers should be visible
      await expect(loginPage.googleButton).not.toBeVisible();
      await expect(loginPage.kakaoButton).not.toBeVisible();
      await expect(loginPage.naverButton).not.toBeVisible();
      await expect(loginPage.appleButton).not.toBeVisible();

      // Local login form should still be visible
      await loginPage.expectLoginFormVisible();
    });
  });

  test.describe('Provider Toggle Effects', () => {
    test('should prevent OAuth initiation for disabled provider', async ({ loginPage, page }) => {
      // Mock only Google enabled
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [{ provider: 'GOOGLE', displayName: 'Google' }],
          }),
        });
      });

      // Mock OAuth initiation rejection for disabled provider
      await page.route('**/auth/v1/oauth/kakao*', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Provider not enabled',
            message: 'Kakao OAuth provider is currently disabled',
          }),
        });
      });

      await loginPage.goto();

      // Kakao button should not be visible (filtered by frontend)
      await expect(loginPage.kakaoButton).not.toBeVisible();

      // If somehow user tries to access disabled provider directly
      const response = await page.request.get(
        `${page.url().replace('/login', '')}/auth/v1/oauth/kakao`,
      );
      expect(response.status()).toBe(400);
    });

    test('should dynamically update provider list on page reload', async ({ page }) => {
      // First load: all providers enabled
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [
              { provider: 'GOOGLE', displayName: 'Google' },
              { provider: 'KAKAO', displayName: 'Kakao' },
              { provider: 'NAVER', displayName: 'Naver' },
              { provider: 'APPLE', displayName: 'Apple' },
            ],
          }),
        });
      });

      await page.goto('/login');
      const googleButton = page.getByRole('button', { name: /google/i });
      const kakaoButton = page.getByRole('button', { name: /kakao/i });

      await expect(googleButton).toBeVisible();
      await expect(kakaoButton).toBeVisible();

      // Simulate admin disabling Kakao provider
      await page.unroute('**/auth/v1/oauth/enabled');
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [
              { provider: 'GOOGLE', displayName: 'Google' },
              { provider: 'NAVER', displayName: 'Naver' },
              { provider: 'APPLE', displayName: 'Apple' },
            ],
          }),
        });
      });

      // Reload page
      await page.reload();

      // Google should still be visible, Kakao should not
      await expect(googleButton).toBeVisible();
      await expect(kakaoButton).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API error when fetching enabled providers', async ({ loginPage, page }) => {
      // Mock API error
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
          }),
        });
      });

      await loginPage.goto();

      // Should fallback to showing no OAuth buttons or show all
      // (depending on implementation - verify actual behavior)
      // Local login should still work
      await loginPage.expectLoginFormVisible();
    });

    test('should handle network timeout when fetching providers', async ({ loginPage, page }) => {
      // Mock network timeout
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.abort('timedout');
      });

      await loginPage.goto();

      // Should timeout gracefully and show local login
      await loginPage.expectLoginFormVisible();
    });
  });

  test.describe('Provider Display Names', () => {
    test('should display custom provider names from API', async ({ page }) => {
      // Mock providers with custom display names
      await page.route('**/auth/v1/oauth/enabled', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [
              { provider: 'GOOGLE', displayName: 'Sign in with Google' },
              { provider: 'KAKAO', displayName: '카카오 로그인' },
            ],
          }),
        });
      });

      await page.goto('/login');

      // Check custom display names
      await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /카카오 로그인/i })).toBeVisible();
    });
  });
});
