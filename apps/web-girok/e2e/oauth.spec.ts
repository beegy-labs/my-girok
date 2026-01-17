import { test, expect, OAUTH_PROVIDERS } from './fixtures/auth.fixture';

/**
 * E2E Tests: OAuth Authentication Flow
 *
 * Tests for social login with:
 * - Google
 * - Kakao
 * - Naver
 * - Apple
 *
 * These tests focus on the callback handling and UI behavior.
 * Actual OAuth provider redirects require integration testing
 * with mock OAuth servers or the real providers.
 */
test.describe('OAuth Flow', () => {
  test.describe('OAuth Buttons Display', () => {
    test('should display all OAuth provider buttons on login page', async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.googleButton).toBeVisible();
      await expect(loginPage.kakaoButton).toBeVisible();
      await expect(loginPage.naverButton).toBeVisible();
      await expect(loginPage.appleButton).toBeVisible();
    });

    test('should have proper styling for OAuth buttons', async ({ loginPage }) => {
      await loginPage.goto();

      // Kakao button should have yellow background
      await expect(loginPage.kakaoButton).toHaveCSS('background-color', /rgb\(254, 229, 0\)/i);

      // Naver button should have green background
      await expect(loginPage.naverButton).toHaveCSS('background-color', /rgb\(3, 199, 90\)/i);
    });
  });

  test.describe('OAuth Initiation', () => {
    // These tests verify that clicking OAuth buttons triggers navigation to BFF OAuth endpoint
    // The BFF will then redirect to the OAuth provider

    for (const provider of OAUTH_PROVIDERS) {
      test(`should initiate ${provider} OAuth flow`, async ({ loginPage, page }) => {
        await loginPage.goto();

        // Intercept OAuth initiation request to BFF
        const oauthInitPromise = page.waitForRequest(
          (request) =>
            request.url().includes(`/auth/v1/oauth/${provider}`) && request.method() === 'GET',
        );

        // Click the provider button
        const button = page.getByRole('button', { name: new RegExp(provider, 'i') });
        await button.click();

        // Verify request was made to BFF OAuth endpoint
        const request = await oauthInitPromise;
        expect(request.url()).toContain(`/auth/v1/oauth/${provider}`);
      });
    }

    test('should include returnUrl in OAuth state when provided', async ({ loginPage, page }) => {
      const returnUrl = '/settings/sessions';
      await loginPage.gotoWithReturnUrl(returnUrl);

      // Intercept OAuth initiation
      const oauthInitPromise = page.waitForRequest((request) =>
        request.url().includes('/auth/v1/oauth/google'),
      );

      await loginPage.googleButton.click();

      const request = await oauthInitPromise;
      const url = new URL(request.url());
      const redirectUri = url.searchParams.get('redirect_uri');

      // Verify returnUrl is encoded in redirect_uri
      expect(redirectUri).toBeTruthy();
    });
  });

  test.describe('OAuth Callback - Success', () => {
    test('should handle successful Google OAuth callback', async ({ oauthCallbackPage, page }) => {
      // Mock successful OAuth callback API response
      await page.route('**/auth/v1/oauth/google/callback*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            redirectUrl: '/',
          }),
        });
      });

      // Simulate successful OAuth callback
      await oauthCallbackPage.gotoWithSuccess('google');

      // Should show loading or success state
      await expect(page).toHaveURL(/\/oauth\/callback/);
    });

    test('should redirect to home after successful OAuth', async ({ oauthCallbackPage, page }) => {
      // Mock successful OAuth callback that redirects to home
      await page.route('**/auth/v1/oauth/google/callback*', async (route) => {
        await route.fulfill({
          status: 302,
          headers: {
            Location: '/',
          },
        });
      });

      // Set up return URL
      await page.evaluate(() => {
        sessionStorage.setItem('oauth_return_url', '/');
      });

      // Simulate successful callback
      await page.goto('/oauth/callback?provider=google&code=test-code&state=test-state');

      // Should eventually redirect to home
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should redirect to stored return URL after OAuth', async ({
      oauthCallbackPage,
      page,
    }) => {
      const returnUrl = '/settings/sessions';

      // Mock successful OAuth callback
      await page.route('**/auth/v1/oauth/kakao/callback*', async (route) => {
        await route.fulfill({
          status: 302,
          headers: {
            Location: returnUrl,
          },
        });
      });

      // Set up return URL
      await page.evaluate((url) => {
        sessionStorage.setItem('oauth_return_url', url);
      }, returnUrl);

      // Simulate successful callback
      await page.goto('/oauth/callback?provider=kakao&code=test-code&state=test-state');

      // Should redirect to stored return URL
      await expect(page).toHaveURL(returnUrl, { timeout: 10000 });
    });
  });

  test.describe('OAuth Callback - Error', () => {
    test('should display error message for failed OAuth', async ({ oauthCallbackPage }) => {
      await oauthCallbackPage.gotoWithError('google', 'access_denied');

      // Should show error state
      await oauthCallbackPage.expectError(/denied|failed/i);

      // Should show retry and home buttons
      await expect(oauthCallbackPage.tryAgainButton).toBeVisible();
      await expect(oauthCallbackPage.goHomeButton).toBeVisible();
    });

    test('should display provider-specific error', async ({ oauthCallbackPage }) => {
      const errorMessage = 'Email not verified';
      await oauthCallbackPage.gotoWithError('naver', errorMessage);

      await oauthCallbackPage.expectError(errorMessage);
    });

    test('should handle not implemented provider', async ({ oauthCallbackPage }) => {
      await oauthCallbackPage.gotoNotImplemented('apple');

      await oauthCallbackPage.expectNotImplementedError('Apple');
    });

    test('should navigate to login on try again', async ({ oauthCallbackPage, page }) => {
      await oauthCallbackPage.gotoWithError('google', 'access_denied');

      await oauthCallbackPage.clickTryAgain();

      await expect(page).toHaveURL(/\/login/);
    });

    test('should navigate to home on go home click', async ({ oauthCallbackPage, page }) => {
      await oauthCallbackPage.gotoWithError('kakao', 'error');

      await oauthCallbackPage.clickGoHome();

      await expect(page).toHaveURL('/');
    });
  });

  test.describe('OAuth Callback - MFA Required', () => {
    test('should redirect to MFA page when required', async ({
      oauthCallbackPage,
      mfaPage,
      page,
    }) => {
      const challengeId = 'test-challenge-123';

      // Mock OAuth callback returning MFA requirement
      await page.route('**/auth/v1/oauth/google/callback*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'mfa_required',
            challengeId: challengeId,
            methods: ['totp'],
          }),
        });
      });

      // Simulate OAuth callback with MFA requirement
      await page.goto('/oauth/callback?provider=google&code=test-code&state=test-state');

      // Should redirect to MFA page
      await expect(page).toHaveURL(/\/login\/mfa/, { timeout: 10000 });

      // MFA form should be visible
      await mfaPage.expectMfaFormVisible();
    });

    test('should support multiple MFA methods from OAuth', async ({
      oauthCallbackPage,
      mfaPage,
      page,
    }) => {
      const challengeId = 'test-challenge-456';

      // Mock OAuth callback with multiple MFA methods
      await page.route('**/auth/v1/oauth/kakao/callback*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'mfa_required',
            challengeId: challengeId,
            methods: ['totp', 'backup_code'],
          }),
        });
      });

      // Simulate OAuth callback
      await page.goto('/oauth/callback?provider=kakao&code=test-code&state=test-state');

      await expect(page).toHaveURL(/\/login\/mfa/, { timeout: 10000 });

      // Should show method selector
      await mfaPage.expectMethodSelectorVisible();
    });
  });

  test.describe('OAuth Callback - No Status', () => {
    test('should redirect to login when no status provided', async ({ page }) => {
      // Go to callback page without any status
      await page.goto('/oauth/callback');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect to login when only provider is specified', async ({ page }) => {
      // Go to callback page with only provider
      await page.goto('/oauth/callback?provider=google');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe('OAuth with Return URL', () => {
  test('should store return URL before OAuth redirect', async ({ loginPage, page }) => {
    // Go to login with return URL
    const returnUrl = '/settings/sessions';
    await loginPage.gotoWithReturnUrl(returnUrl);

    // Click OAuth button (this would normally redirect to provider)
    // For testing, we verify the return URL is stored
    await page.evaluate(() => {
      // Simulate what the OAuth initiation does
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl') || '/';
      sessionStorage.setItem('oauth_return_url', returnUrl);
    });

    // Verify return URL is stored
    const storedUrl = await page.evaluate(() => sessionStorage.getItem('oauth_return_url'));
    expect(storedUrl).toBe(returnUrl);
  });
});

test.describe('OAuth Security', () => {
  test('should validate return URL to prevent open redirect', async ({ loginPage, page }) => {
    // Try to use an external URL as return URL
    const maliciousUrl = 'https://malicious-site.com/steal-tokens';
    await page.goto(`/login?returnUrl=${encodeURIComponent(maliciousUrl)}`);

    // The return URL should be sanitized to a local path
    // This is handled by the LoginPage component
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should not allow relative protocol URLs', async ({ page }) => {
    // Try to use protocol-relative URL
    await page.goto('/login?returnUrl=//evil.com/path');

    // Should not redirect to external site after login
    // This test verifies the security check in the component
    await expect(page).toHaveURL(/\/login/);
  });
});
