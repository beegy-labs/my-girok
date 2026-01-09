import { test as base, expect } from '@playwright/test';
import { LoginPage, MfaPage, SessionsPage, OAuthCallbackPage } from '../page-objects';

/**
 * Test fixtures for authentication E2E tests
 *
 * Provides pre-configured page objects and test utilities.
 */

// Test user credentials for E2E tests
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPass123!',
  name: 'E2E Test User',
};

// Invalid credentials for negative tests
export const INVALID_USER = {
  email: 'nonexistent@example.com',
  password: 'WrongPassword123!',
};

// Weak password for validation tests
export const WEAK_PASSWORD = 'weak';

// MFA test codes
export const MFA_CODES = {
  validTotp: '123456',
  invalidTotp: '000000',
  validBackupCode: 'ABCD-1234',
  invalidBackupCode: 'XXXX-0000',
};

// OAuth providers
export const OAUTH_PROVIDERS = ['google', 'kakao', 'naver', 'apple'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

// Extended test with page object fixtures
type AuthFixtures = {
  loginPage: LoginPage;
  mfaPage: MfaPage;
  sessionsPage: SessionsPage;
  oauthCallbackPage: OAuthCallbackPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  mfaPage: async ({ page }, use) => {
    const mfaPage = new MfaPage(page);
    await use(mfaPage);
  },

  sessionsPage: async ({ page }, use) => {
    const sessionsPage = new SessionsPage(page);
    await use(sessionsPage);
  },

  oauthCallbackPage: async ({ page }, use) => {
    const oauthCallbackPage = new OAuthCallbackPage(page);
    await use(oauthCallbackPage);
  },
});

export { expect };

/**
 * Helper to create a unique test user email
 */
export function createTestUserEmail(): string {
  return `e2e-test-${Date.now()}@example.com`;
}

/**
 * Helper to perform login through the UI
 * Useful for tests that need an authenticated session
 */
export async function performLogin(
  page: import('@playwright/test').Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password,
) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
}
