import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsMaster } from './helpers/auth';
import { TEST_CONFIG } from './fixtures/test-config';

/**
 * E2E Tests: OAuth Settings Management
 *
 * Tests for MASTER admin OAuth provider configuration:
 * - View all OAuth provider configurations
 * - Enable/disable providers
 * - Update OAuth credentials (client ID, secret, callback URL)
 * - Verify encryption and secret masking
 * - RBAC enforcement (MASTER role only)
 */
test.describe('OAuth Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as MASTER admin
    await loginAsMaster(page);
  });

  test.describe('OAuth Settings Page Access', () => {
    test('should allow MASTER admin to access OAuth Settings page', async ({ page }) => {
      await page.goto('/system/oauth-settings');

      // Page should load successfully
      await expect(page).toHaveURL('/system/oauth-settings');
      await expect(page.getByText('OAuth Settings')).toBeVisible();
    });

    test('should display all 4 OAuth providers', async ({ page }) => {
      // Mock OAuth providers API
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
              clientId: 'google-client-id',
              clientSecretMasked: '************1234',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
              updatedAt: new Date().toISOString(),
              updatedBy: 'admin-123',
            },
            {
              provider: 'KAKAO',
              enabled: false,
              displayName: 'Kakao',
              clientId: 'kakao-client-id',
              clientSecretMasked: '************5678',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/kakao/callback',
              updatedAt: new Date().toISOString(),
              updatedBy: 'admin-123',
            },
            {
              provider: 'NAVER',
              enabled: true,
              displayName: 'Naver',
              clientId: 'naver-client-id',
              clientSecretMasked: '************9012',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/naver/callback',
              updatedAt: new Date().toISOString(),
              updatedBy: 'admin-123',
            },
            {
              provider: 'APPLE',
              enabled: false,
              displayName: 'Apple',
              updatedAt: new Date().toISOString(),
            },
          ]),
        });
      });

      await page.goto('/system/oauth-settings');

      // All provider cards should be visible
      await expect(page.getByText('Google')).toBeVisible();
      await expect(page.getByText('Kakao')).toBeVisible();
      await expect(page.getByText('Naver')).toBeVisible();
      await expect(page.getByText('Apple')).toBeVisible();
    });

    test('should display security notice', async ({ page }) => {
      await page.goto('/system/oauth-settings');

      // Security notice should be visible
      await expect(page.getByText(/Security Notice/i)).toBeVisible();
      await expect(page.getByText(/AES-256-GCM/i)).toBeVisible();
    });
  });

  test.describe('Provider Toggle', () => {
    test('should enable a disabled provider', async ({ page }) => {
      // Mock initial state: Kakao disabled
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'KAKAO',
              enabled: false,
              displayName: 'Kakao',
              clientId: 'kakao-client-id',
              clientSecretMasked: '************5678',
            },
          ]),
        });
      });

      // Mock toggle API
      let toggledToEnabled = false;
      await page.route('**/admin/v1/oauth/providers/KAKAO/toggle', async (route) => {
        const request = await route.request();
        const body = JSON.parse(request.postData() || '{}');

        if (body.enabled === true) {
          toggledToEnabled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              provider: 'KAKAO',
              enabled: true,
              displayName: 'Kakao',
            }),
          });
        } else {
          await route.abort();
        }
      });

      await page.goto('/system/oauth-settings');

      // Find Kakao provider card
      const kakaoCard = page.locator('text=Kakao').locator('..');

      // Should show "Disabled" badge
      await expect(kakaoCard.getByText('Disabled')).toBeVisible();

      // Click Enable button
      await kakaoCard.getByRole('button', { name: /enable/i }).click();

      // Should confirm toggle
      expect(toggledToEnabled).toBe(true);

      // Should show success message (toast/notification)
      await expect(page.getByText(/enabled.*successfully/i)).toBeVisible({ timeout: 5000 });
    });

    test('should disable an enabled provider', async ({ page }) => {
      // Mock initial state: Google enabled
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
              clientId: 'google-client-id',
              clientSecretMasked: '************1234',
            },
          ]),
        });
      });

      // Mock toggle API
      let toggledToDisabled = false;
      await page.route('**/admin/v1/oauth/providers/GOOGLE/toggle', async (route) => {
        const request = await route.request();
        const body = JSON.parse(request.postData() || '{}');

        if (body.enabled === false) {
          toggledToDisabled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              provider: 'GOOGLE',
              enabled: false,
              displayName: 'Google',
            }),
          });
        } else {
          await route.abort();
        }
      });

      await page.goto('/system/oauth-settings');

      const googleCard = page.locator('text=Google').locator('..');

      // Should show "Enabled" badge
      await expect(googleCard.getByText('Enabled')).toBeVisible();

      // Click Disable button
      await googleCard.getByRole('button', { name: /disable/i }).click();

      expect(toggledToDisabled).toBe(true);
    });

    test('should prevent disabling LOCAL provider', async ({ page }) => {
      // Note: LOCAL provider should not appear in OAuth settings
      // This test verifies the backend rejects such attempts
      await page.route('**/admin/v1/oauth/providers/LOCAL/toggle', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'Cannot disable LOCAL provider',
          }),
        });
      });

      // Attempt to toggle LOCAL (should be blocked by backend)
      const response = await page.request.post(
        `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/LOCAL/toggle`,
        {
          data: { enabled: false },
        },
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Update Credentials', () => {
    test('should update provider credentials', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
              clientId: 'old-client-id',
              clientSecretMasked: '************1234',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
            },
          ]),
        });
      });

      let credentialsUpdated = false;
      await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
        const request = await route.request();
        const body = JSON.parse(request.postData() || '{}');

        if (
          body.clientId === 'new-client-id' &&
          body.clientSecret === 'new-secret' &&
          body.callbackUrl === 'https://auth-bff.girok.dev/oauth/google/callback'
        ) {
          credentialsUpdated = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              provider: 'GOOGLE',
              enabled: true,
              clientId: 'new-client-id',
              clientSecretMasked: '************cret',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
            }),
          });
        } else {
          await route.abort();
        }
      });

      await page.goto('/system/oauth-settings');

      const googleCard = page.locator('text=Google').locator('..');

      // Click Edit Credentials
      await googleCard.getByRole('button', { name: /edit credentials/i }).click();

      // Form should be visible
      await expect(page.getByLabel('Client ID')).toBeVisible();
      await expect(page.getByLabel('Client Secret')).toBeVisible();
      await expect(page.getByLabel('Callback URL')).toBeVisible();

      // Fill in new credentials
      await page.getByLabel('Client ID').fill('new-client-id');
      await page.getByLabel('Client Secret').fill('new-secret');
      await page
        .getByLabel('Callback URL')
        .fill('https://auth-bff.girok.dev/oauth/google/callback');

      // Save
      await page.getByRole('button', { name: /save changes/i }).click();

      expect(credentialsUpdated).toBe(true);

      // Success message
      await expect(page.getByText(/updated.*successfully/i)).toBeVisible({ timeout: 5000 });
    });

    test('should mask client secret (show only last 4 chars)', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
              clientId: 'google-client-id',
              clientSecretMasked: '************abcd',
              callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
            },
          ]),
        });
      });

      await page.goto('/system/oauth-settings');

      // Secret should be masked
      await expect(page.getByText('************abcd')).toBeVisible();

      // Should not show full secret
      await expect(page.getByText(/^[a-zA-Z0-9]{20,}$/)).not.toBeVisible();
    });

    test('should reject invalid callback URL domain', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
        const request = await route.request();
        const body = JSON.parse(request.postData() || '{}');

        if (body.callbackUrl?.includes('evil.com')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Bad Request',
              message: 'Invalid callback URL domain',
            }),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.goto('/system/oauth-settings');

      const googleCard = page.locator('text=Google').locator('..');
      await googleCard.getByRole('button', { name: /edit credentials/i }).click();

      // Try to use evil.com
      await page.getByLabel('Callback URL').fill('https://evil.com/callback');
      await page.getByRole('button', { name: /save changes/i }).click();

      // Should show error
      await expect(page.getByText(/invalid.*callback.*url/i)).toBeVisible({ timeout: 5000 });
    });

    test('should accept valid girok.dev callback URLs', async ({ page }) => {
      const validUrls = [
        'http://localhost:4005/oauth/google/callback',
        'https://girok.dev/oauth/google/callback',
        'https://auth.girok.dev/oauth/google/callback',
        'https://auth-bff.girok.dev/oauth/google/callback',
      ];

      for (const url of validUrls) {
        await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ callbackUrl: url }),
          });
        });

        const response = await page.request.put(
          `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/GOOGLE/credentials`,
          {
            data: { callbackUrl: url },
          },
        );

        expect(response.status()).toBe(200);
      }
    });
  });

  test.describe('Refresh Functionality', () => {
    test('should refresh provider list', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
            },
          ]),
        });
      });

      await page.goto('/system/oauth-settings');

      const initialRequestCount = requestCount;

      // Click Refresh button
      await page.getByRole('button', { name: /refresh/i }).click();

      // Should trigger another API call
      expect(requestCount).toBeGreaterThan(initialRequestCount);
    });
  });

  test.describe('Error Handling', () => {
    test('should display error when API fails to load providers', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Should show error state
      await expect(page.getByText(/failed to load providers/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await route.abort('timedout');
      });

      await page.goto('/system/oauth-settings');

      // Should show loading initially, then error
      await expect(page.getByText(/loading|error/i)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('RBAC Enforcement', () => {
    test('should forbid non-MASTER users from accessing OAuth Settings', async ({ page }) => {
      // Logout and login as ADMIN (not MASTER)
      await page.goto('/logout');
      await loginAsAdmin(page); // Assuming this helper exists

      // Mock 403 response for non-MASTER
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'MASTER role required',
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Should show forbidden error or redirect
      await expect(page.getByText(/forbidden|not authorized|master role required/i)).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Clear auth cookies
      await page.context().clearCookies();

      await page.goto('/system/oauth-settings');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Help Section', () => {
    test('should display OAuth provider setup guide', async ({ page }) => {
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      await page.goto('/system/oauth-settings');

      // Help section should be visible
      await expect(page.getByText('OAuth Provider Setup Guide')).toBeVisible();
      await expect(page.getByText('Google OAuth 2.0')).toBeVisible();
      await expect(page.getByText('Kakao Login')).toBeVisible();
      await expect(page.getByText('Naver Login')).toBeVisible();
      await expect(page.getByText('Sign in with Apple')).toBeVisible();
    });
  });
});
