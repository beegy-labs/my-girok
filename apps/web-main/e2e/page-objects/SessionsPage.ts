import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for Sessions management page
 *
 * Encapsulates sessions page selectors and common interactions.
 */
export class SessionsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly currentSessionCard: Locator;
  readonly revokeAllButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly backToSettingsLink: Locator;
  readonly deviceInfo: Locator;
  readonly browserInfo: Locator;
  readonly statusInfo: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page elements
    this.pageTitle = page.getByRole('heading', { name: /active sessions/i });
    this.currentSessionCard = page.getByText(/current session/i);
    this.revokeAllButton = page.getByRole('button', { name: /sign out.*other|revoke/i });

    // Feedback messages
    this.successMessage = page.locator('[class*="green"], [class*="success"]').filter({
      hasText: /successfully|revoked/i,
    });
    this.errorMessage = page.locator('[class*="red"], [class*="error"]').filter({
      hasText: /failed|error/i,
    });

    // Navigation
    this.backToSettingsLink = page.getByRole('link', { name: /back.*settings/i });

    // Device info
    this.deviceInfo = page.getByText(/device/i).locator('..');
    this.browserInfo = page.getByText(/browser/i).locator('..');
    this.statusInfo = page.getByText(/status/i).locator('..');
  }

  async goto() {
    await this.page.goto('/settings/sessions');
  }

  async revokeAllSessions() {
    await this.revokeAllButton.click();
  }

  async goBackToSettings() {
    await this.backToSettingsLink.click();
  }

  async expectPageVisible() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.currentSessionCard).toBeVisible();
  }

  async expectCurrentSessionInfo() {
    await expect(this.deviceInfo).toBeVisible();
    await expect(this.browserInfo).toBeVisible();
    await expect(this.statusInfo).toBeVisible();
  }

  async expectSuccessMessage(message?: string | RegExp) {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    }
  }

  async expectErrorMessage(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
