import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './admin-auth.spec';

/**
 * Legal Documents Management E2E Tests
 */
test.describe('Legal Documents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display legal documents list', async ({ page }) => {
    // Navigate to legal documents
    await page.getByText('Legal').click();
    await page.getByText('Documents').click();

    await expect(page).toHaveURL('/legal/documents');
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible();
  });

  test('should filter documents by type', async ({ page }) => {
    await page.goto('/legal/documents');

    // Select TERMS_OF_SERVICE filter
    const typeFilter = page.getByRole('combobox', { name: /type/i });
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('TERMS_OF_SERVICE');
      await expect(page.getByText(/terms of service/i)).toBeVisible();
    }
  });

  test('should open create document form', async ({ page }) => {
    await page.goto('/legal/documents');

    // Click create button
    await page.getByRole('button', { name: /create|new/i }).click();

    await expect(page).toHaveURL('/legal/documents/new');
    await expect(page.getByRole('heading', { name: /create|new document/i })).toBeVisible();
  });

  test('should create new document', async ({ page }) => {
    await page.goto('/legal/documents/new');

    // Fill form
    await page.getByLabel(/type/i).selectOption('PRIVACY_POLICY');
    await page.getByLabel(/locale/i).fill('en');
    await page.getByLabel(/version/i).fill('1.0.0');
    await page.getByLabel(/title/i).fill('Test Privacy Policy');

    // Fill TipTap editor (content area)
    const editor = page.locator('.tiptap, [contenteditable="true"]').first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type('This is a test privacy policy content.');
    }

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();

    // Should redirect to list or show success message
    await expect(page.getByText(/success|created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should edit existing document', async ({ page }) => {
    await page.goto('/legal/documents');

    // Click edit on first document
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Should show edit form
      await expect(page.getByRole('heading', { name: /edit/i })).toBeVisible();

      // Change title
      const titleInput = page.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill('Updated Title');

      // Save
      await page.getByRole('button', { name: /save|update/i }).click();
      await expect(page.getByText(/success|updated/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view consent statistics', async ({ page }) => {
    // Navigate to consent stats
    await page.getByText('Legal').click();
    await page.getByText(/statistics|stats/i).click();

    await expect(page).toHaveURL('/legal/consent-stats');

    // Should display charts
    await expect(page.locator('.recharts-responsive-container, svg')).toBeVisible();
  });

  test('should display country consent examples', async ({ page }) => {
    // Navigate to examples
    await page.getByText('Legal').click();
    await page.getByText(/examples|country/i).click();

    await expect(page).toHaveURL('/legal/examples');

    // Select different regions
    const regionSelect = page.getByRole('combobox');
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption('KR');
      await expect(page.getByText(/PIPA/i)).toBeVisible();

      await regionSelect.selectOption('EU');
      await expect(page.getByText(/GDPR/i)).toBeVisible();
    }
  });
});
