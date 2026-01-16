import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for MFA Verification page
 *
 * Encapsulates MFA page selectors and common interactions.
 */
export class MfaPage {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  readonly backToLoginButton: Locator;
  readonly totpMethodButton: Locator;
  readonly backupCodeMethodButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.codeInput = page.getByLabel(/code|verification/i);
    this.verifyButton = page.getByRole('button', { name: /verify/i });
    this.backToLoginButton = page.getByRole('button', { name: /back.*login/i });

    // Method selectors
    this.totpMethodButton = page.getByRole('button', { name: /authenticator|totp/i });
    this.backupCodeMethodButton = page.getByRole('button', { name: /backup/i });

    // Error message
    this.errorMessage = page.locator('[role="alert"], .error, [class*="error"]');
  }

  async goto() {
    await this.page.goto('/login/mfa');
  }

  async fillCode(code: string) {
    await this.codeInput.fill(code);
  }

  async verify() {
    await this.verifyButton.click();
  }

  async verifyWithCode(code: string) {
    await this.fillCode(code);
    await this.verify();
  }

  async selectTotpMethod() {
    await this.totpMethodButton.click();
  }

  async selectBackupCodeMethod() {
    await this.backupCodeMethodButton.click();
  }

  async goBackToLogin() {
    await this.backToLoginButton.click();
  }

  async expectMfaFormVisible() {
    await expect(this.codeInput).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
  }

  async expectErrorMessage(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectMethodSelectorVisible() {
    await expect(this.totpMethodButton).toBeVisible();
    await expect(this.backupCodeMethodButton).toBeVisible();
  }
}
