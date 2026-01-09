import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for Login page
 *
 * Encapsulates login page selectors and common interactions.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberEmailCheckbox: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  // OAuth buttons
  readonly googleButton: Locator;
  readonly kakaoButton: Locator;
  readonly naverButton: Locator;
  readonly appleButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /login|sign in/i });
    this.rememberEmailCheckbox = page.getByLabel(/remember/i);
    this.errorMessage = page.locator('[role="alert"], .error, [class*="error"]');

    // Navigation links
    this.registerLink = page.getByRole('link', { name: /register/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot/i });

    // OAuth buttons
    this.googleButton = page.getByRole('button', { name: /google/i });
    this.kakaoButton = page.getByRole('button', { name: /kakao/i });
    this.naverButton = page.getByRole('button', { name: /naver/i });
    this.appleButton = page.getByRole('button', { name: /apple/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async gotoWithReturnUrl(returnUrl: string) {
    await this.page.goto(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectLoginFormVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectErrorMessage(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectOAuthButtonsVisible() {
    await expect(this.googleButton).toBeVisible();
    await expect(this.kakaoButton).toBeVisible();
    await expect(this.naverButton).toBeVisible();
    await expect(this.appleButton).toBeVisible();
  }
}
