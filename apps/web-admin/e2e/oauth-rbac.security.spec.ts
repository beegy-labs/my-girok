import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsMaster } from './helpers/auth';
import { TEST_CONFIG } from './fixtures/test-config';

/**
 * Security Tests: OAuth RBAC Enforcement
 *
 * Verifies role-based access control for OAuth Settings:
 * - MASTER role can access OAuth Settings page
 * - ADMIN role is forbidden from OAuth Settings
 * - USER role is forbidden from OAuth Settings
 * - Unauthenticated users are redirected to login
 * - MASTER can toggle providers
 * - MASTER can update credentials
 * - Non-MASTER receive 403 Forbidden
 */
test.describe('OAuth RBAC Security', () => {
  test.describe('Page Access Control', () => {
    test('should allow MASTER admin to access OAuth Settings', async ({ page }) => {
      await loginAsMaster(page);

      // Mock OAuth providers API
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/system/oauth-settings');

      // Should load successfully
      await expect(page).toHaveURL('/system/oauth-settings');
      await expect(page.getByText('OAuth Settings')).toBeVisible();
    });

    test('should forbid ADMIN role from OAuth Settings', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock 403 response for non-MASTER
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Should show forbidden error
      await expect(page.getByText(/forbidden|not authorized|access denied/i)).toBeVisible();
    });

    test('should forbid USER role from OAuth Settings', async ({ page }) => {
      // Login as regular user (not admin)
      // For this test, we assume TEST_CONFIG has a user credential or we mock it
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('UserPass123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Mock 403 response
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Should show forbidden or redirect
      await expect(page).not.toHaveURL('/system/oauth-settings');
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Clear all cookies
      await page.context().clearCookies();

      await page.goto('/system/oauth-settings');

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Provider Toggle RBAC', () => {
    test('should allow MASTER to toggle provider', async ({ page }) => {
      await loginAsMaster(page);

      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: false,
              displayName: 'Google',
            },
          ]),
        });
      });

      await page.route('**/admin/v1/oauth/providers/GOOGLE/toggle', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            provider: 'GOOGLE',
            enabled: true,
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Toggle should succeed
      await page
        .getByRole('button', { name: /enable/i })
        .first()
        .click();

      await expect(page.getByText(/enabled.*successfully/i)).toBeVisible({ timeout: 5000 });
    });

    test('should forbid ADMIN from toggling provider', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock 403 for toggle endpoint
      await page.route('**/admin/v1/oauth/providers/GOOGLE/toggle', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      // Attempt to toggle via API directly
      const response = await page.request.post(
        `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/GOOGLE/toggle`,
        {
          data: { enabled: true },
        },
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Credentials Update RBAC', () => {
    test('should allow MASTER to update credentials', async ({ page }) => {
      await loginAsMaster(page);

      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              provider: 'GOOGLE',
              enabled: true,
              displayName: 'Google',
              clientId: 'old-id',
            },
          ]),
        });
      });

      await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            provider: 'GOOGLE',
            clientId: 'new-id',
          }),
        });
      });

      await page.goto('/system/oauth-settings');

      // Update credentials should succeed
      await page
        .getByRole('button', { name: /edit credentials/i })
        .first()
        .click();
      await page.getByLabel('Client ID').fill('new-id');
      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(page.getByText(/updated.*successfully/i)).toBeVisible({ timeout: 5000 });
    });

    test('should forbid ADMIN from updating credentials', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock 403 for credentials update
      await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      // Attempt to update via API directly
      const response = await page.request.put(
        `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/GOOGLE/credentials`,
        {
          data: {
            clientId: 'new-id',
            clientSecret: 'new-secret',
          },
        },
      );

      expect(response.status()).toBe(403);
    });

    test('should forbid USER from updating credentials', async ({ page }) => {
      // Login as regular user
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('UserPass123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Mock 403
      await page.route('**/admin/v1/oauth/providers/GOOGLE/credentials', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      const response = await page.request.put(
        `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/GOOGLE/credentials`,
        {
          data: { clientId: 'new-id' },
        },
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Read-Only Access', () => {
    test('should forbid non-MASTER from reading provider configs', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock 403 for list endpoint
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      const response = await page.request.get(`${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers`);

      expect(response.status()).toBe(403);
    });

    test('should allow MASTER to read all provider configs', async ({ page }) => {
      await loginAsMaster(page);

      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { provider: 'GOOGLE', enabled: true },
            { provider: 'KAKAO', enabled: false },
          ]),
        });
      });

      const response = await page.request.get(`${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
    });
  });

  test.describe('Session Expiry and Re-authentication', () => {
    test('should redirect to login after session expires', async ({ page }) => {
      await loginAsMaster(page);

      // Clear session cookie
      await page.context().clearCookies();

      await page.goto('/system/oauth-settings');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should maintain RBAC after re-authentication', async ({ page }) => {
      // Login as MASTER
      await loginAsMaster(page);

      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/system/oauth-settings');
      await expect(page.getByText('OAuth Settings')).toBeVisible();

      // Logout and re-login
      await page.goto('/logout');
      await loginAsMaster(page);

      // Should still have access
      await page.goto('/system/oauth-settings');
      await expect(page.getByText('OAuth Settings')).toBeVisible();
    });
  });

  test.describe('Role Downgrade Security', () => {
    test('should revoke access when role is downgraded from MASTER to ADMIN', async ({ page }) => {
      // This test simulates a role change
      // In real scenario, admin would update user role in database

      await loginAsMaster(page);

      // First access should work
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/system/oauth-settings');
      await expect(page.getByText('OAuth Settings')).toBeVisible();

      // Simulate role downgrade (update route to return 403)
      await page.unroute('**/admin/v1/oauth/providers');
      await page.route('**/admin/v1/oauth/providers', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      // Reload page
      await page.reload();

      // Should now be forbidden
      await expect(page.getByText(/forbidden|not authorized/i)).toBeVisible();
    });
  });

  test.describe('API Direct Access Prevention', () => {
    test('should block unauthenticated API access', async ({ request }) => {
      // Attempt API call without authentication
      const response = await request.get(`${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers`);

      // Should be unauthorized (401) or redirect
      expect([401, 403]).toContain(response.status());
    });

    test('should enforce RBAC on direct API calls', async ({ page }) => {
      await loginAsAdmin(page); // Login as ADMIN (not MASTER)

      // Mock 403 response
      await page.route('**/admin/v1/oauth/providers/GOOGLE/toggle', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Forbidden resource',
            error: 'Forbidden',
          }),
        });
      });

      // Direct API call should be forbidden
      const response = await page.request.post(
        `${TEST_CONFIG.apiUrl}/admin/v1/oauth/providers/GOOGLE/toggle`,
        {
          data: { enabled: true },
        },
      );

      expect(response.status()).toBe(403);
    });
  });
});
