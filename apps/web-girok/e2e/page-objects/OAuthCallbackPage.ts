import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for OAuth Callback page
 *
 * Encapsulates OAuth callback page selectors and common interactions.
 */
export class OAuthCallbackPage {
  readonly page: Page;
  readonly loadingSpinner: Locator;
  readonly successIcon: Locator;
  readonly errorIcon: Locator;
  readonly errorMessage: Locator;
  readonly tryAgainButton: Locator;
  readonly goHomeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Status indicators
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.successIcon = page.locator('[class*="green"]').filter({
      has: page.locator('svg'),
    });
    this.errorIcon = page.locator('[class*="red"]').filter({
      has: page.locator('svg'),
    });

    // Messages
    this.errorMessage = page.locator('p').filter({
      hasText: /failed|error|not.*available/i,
    });

    // Buttons
    this.tryAgainButton = page.getByRole('button', { name: /try again/i });
    this.goHomeButton = page.getByRole('button', { name: /go home|home/i });
  }

  async gotoWithSuccess(provider: string) {
    await this.page.goto(`/oauth/callback?provider=${provider}&status=success`);
  }

  async gotoWithError(provider: string, error: string) {
    await this.page.goto(
      `/oauth/callback?provider=${provider}&status=error&error=${encodeURIComponent(error)}`,
    );
  }

  async gotoWithMfaRequired(provider: string, challengeId: string, methods: string = 'totp') {
    await this.page.goto(
      `/oauth/callback?provider=${provider}&status=mfa_required&challengeId=${challengeId}&methods=${methods}`,
    );
  }

  async gotoNotImplemented(provider: string) {
    await this.page.goto(`/oauth/callback?provider=${provider}&status=not_implemented`);
  }

  async clickTryAgain() {
    await this.tryAgainButton.click();
  }

  async clickGoHome() {
    await this.goHomeButton.click();
  }

  async expectLoading() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async expectSuccess() {
    await expect(this.successIcon).toBeVisible();
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorIcon).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectNotImplementedError(provider: string) {
    await expect(this.errorMessage).toContainText(new RegExp(`${provider}.*not.*available`, 'i'));
  }
}
